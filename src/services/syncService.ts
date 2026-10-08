import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { organizationRequestConfig, OrganizationSessionChangedError } from './api';
import type { Customer, Product, Sale } from '../types/business';
import { balanceAfterPayment, addCreditBalance } from '../utils/paymentAmounts';
import { deductOfflineStock } from '../utils/offlineStock';

export interface OfflineSaleItem {
    productId: number;
    productName: string;
    brand?: string;
    unit?: string;
    quantity: number;
    price: number;
    gstRate?: number | null;
}
export interface OfflineSale {
    clientReferenceId: string;
    billNumber: string;
    customerId?: number | null;
    customerName: string;
    paymentMode: string;
    paidAmount?: number;
    initialPaymentMode?: string;
    balanceDue?: number;
    discount: number;
    total: number;
    cgst: number;
    sgst: number;
    igst?: number;
    taxType?: 'INTRA_STATE' | 'INTER_STATE';
    grandTotal: number;
    items: OfflineSaleItem[];
    offlineCreatedAt: string;
    syncStatus: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
    serverSaleId?: number;
    errorMessage?: string;
    isOffline: boolean;
}
interface OfflineState {
    version: 2;
    catalogRevision?: number;
    pendingCreditIncluded?: boolean;
    queue: OfflineSale[];
    history: CachedSale[];
    products: Product[];
    customers: Customer[];
}
export type CachedSale = Partial<Omit<Sale, keyof OfflineSale>> &
    Partial<Omit<OfflineSale, keyof Sale>> & {
        [Key in keyof Sale & keyof OfflineSale]?: Sale[Key] | OfflineSale[Key];
    };
export interface SyncResult {
    success: boolean;
    syncedCount: number;
    failedCount: number;
    errorMessage?: string;
}
const stateKey = (orgId: number | string) => `@offline_state_v2_${orgId}`;
const tails = new Map<string, Promise<unknown>>();
const syncs = new Map<string, Promise<SyncResult>>();

// All local operations share a lock. Web Locks additionally coordinate supported browser tabs.
async function locked<T>(orgId: number | string, action: () => Promise<T>): Promise<T> {
    const key = stateKey(orgId);
    const task = (tails.get(key) ?? Promise.resolve())
        .catch(() => {})
        .then(() => {
            const locks = (globalThis as any).navigator?.locks;
            return locks ? locks.request(key, action) : action();
        }) as Promise<T>;
    tails.set(key, task);
    try {
        return await task;
    } finally {
        if (tails.get(key) === task) tails.delete(key);
    }
}
function array<T>(raw: string | null): T[] {
    if (raw === null) return [];
    const value = JSON.parse(raw);
    if (!Array.isArray(value))
        throw new Error('Offline records cannot be read. Existing data has been preserved.');
    return value;
}
function validate(state: OfflineState): OfflineState {
    if (
        !state ||
        state.version !== 2 ||
        ![state.queue, state.history, state.products, state.customers].every(Array.isArray) ||
        state.queue.some(
            (item) =>
                !item ||
                typeof item.clientReferenceId !== 'string' ||
                !item.clientReferenceId ||
                !Array.isArray(item.items),
        ) ||
        new Set(state.queue.map((item) => item.clientReferenceId)).size !== state.queue.length
    ) {
        throw new Error('Offline records cannot be read. Existing data has been preserved.');
    }
    return state;
}
async function saveState(orgId: number | string, state: OfflineState) {
    await AsyncStorage.setItem(stateKey(orgId), JSON.stringify(state));
}
function customersWithPendingCredit(customers: Customer[], queue: OfflineSale[]): Customer[] {
    return customers.map((customer) => {
        let balance = customer.creditBalance;
        for (const pending of queue) {
            if (customer.id == null || pending.customerId !== customer.id || pending.paymentMode !== 'CREDIT')
                continue;
            const due = balanceAfterPayment(pending.grandTotal, pending.paidAmount ?? 0);
            balance = addCreditBalance(balance, due);
        }
        return { ...customer, creditBalance: balance };
    });
}
async function readState(orgId: number | string): Promise<OfflineState> {
    const raw = await AsyncStorage.getItem(stateKey(orgId));
    if (raw !== null) {
        try {
            const state = validate(JSON.parse(raw));
            if (!state.pendingCreditIncluded) {
                state.customers = customersWithPendingCredit(state.customers, state.queue);
                state.pendingCreditIncluded = true;
                await saveState(orgId, state);
            }
            return state;
        } catch (corruptError) {
            console.warn(
                `[syncService] Corrupt offline state detected for org ${orgId}. Quarantining:`,
                corruptError,
            );
            try {
                await AsyncStorage.setItem(
                    `@offline_corrupt_state_${orgId}_${Date.now()}`,
                    raw,
                );
            } catch {}
        }
    }
    try {
        const [queue, history, products, customers] = await Promise.all([
            AsyncStorage.getItem(`@offline_sales_queue_${orgId}`).then(array<OfflineSale>),
            AsyncStorage.getItem(`@offline_sales_history_${orgId}`).then(array<CachedSale>),
            AsyncStorage.getItem(`@offline_products_${orgId}`).then(array<Product>),
            AsyncStorage.getItem(`@offline_customers_${orgId}`).then(array<Customer>),
        ]);
        const state = validate({ version: 2, queue, history, products, customers });
        state.history = [
            ...queue,
            ...history.filter((item) => !queue.some((q) => q.clientReferenceId === item.clientReferenceId)),
        ];
        state.customers = customersWithPendingCredit(state.customers, state.queue);
        state.pendingCreditIncluded = true;
        await saveState(orgId, state);
        return state;
    } catch {
        const cleanState: OfflineState = {
            version: 2,
            queue: [],
            history: [],
            products: [],
            customers: [],
            pendingCreditIncluded: true,
        };
        await saveState(orgId, cleanState);
        return cleanState;
    }
}
function guard(orgId: number | string) {
    const token = organizationRequestConfig(orgId).expectedToken;
    return () => {
        if (organizationRequestConfig(orgId).expectedToken !== token)
            throw new OrganizationSessionChangedError();
    };
}
async function read<T>(orgId: number | string, select: (state: OfflineState) => T): Promise<T> {
    const check = guard(orgId);
    return locked(orgId, async () => {
        check();
        const state = await readState(orgId);
        check();
        return select(state);
    });
}

export const syncService = {
    async getCatalogRevision(orgId: number | string): Promise<number> {
        return read(orgId, (state) => state.catalogRevision ?? 0);
    },
    async cacheCatalog(
        orgId: number | string,
        products: Product[],
        customers: Customer[],
        expectedRevision?: number,
    ) {
        const check = guard(orgId);
        return locked(orgId, async () => {
            check();
            const state = await readState(orgId);
            check();
            if (expectedRevision !== undefined && expectedRevision !== (state.catalogRevision ?? 0))
                throw new Error(
                    'Stock changed while the catalog was loading. Refresh to load the latest stock.',
                );
            // Pending and failed invoices still consume local stock until acknowledged.
            // If a server acknowledgement was lost this can understate stock, safely,
            // until sync confirms the invoice and a subsequent refresh loads the truth.
            state.products = deductOfflineStock(
                products,
                state.queue.flatMap((sale) => sale.items),
                true,
            );
            state.customers = customersWithPendingCredit(customers, state.queue);
            state.catalogRevision = (state.catalogRevision ?? 0) + 1;
            await saveState(orgId, state);
            return { products: state.products, customers: state.customers };
        });
    },
    async getCachedCatalog(orgId: number | string): Promise<{ products: Product[]; customers: Customer[] }> {
        return read(orgId, (state) => ({ products: state.products, customers: state.customers }));
    },
    async createOfflineSale(
        orgId: number | string,
        payload: {
            customerId?: number | null;
            customerName: string;
            paymentMode: string;
            paidAmount?: number;
            initialPaymentMode?: string;
            discount: number;
            total: number;
            cgst: number;
            sgst: number;
            igst?: number;
            taxType?: 'INTRA_STATE' | 'INTER_STATE';
            grandTotal: number;
            items: OfflineSaleItem[];
        },
    ): Promise<OfflineSale> {
        const check = guard(orgId);
        return locked(orgId, async () => {
            check();
            const state = await readState(orgId);
            check();
            const clientReferenceId = `OFF-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
            if (state.history.some((item) => item.clientReferenceId === clientReferenceId))
                throw new Error('Please retry saving this invoice.');
            const paidAmount =
                payload.paidAmount ?? (payload.paymentMode === 'CREDIT' ? 0 : payload.grandTotal);
            const balanceDue = balanceAfterPayment(payload.grandTotal, paidAmount);
            const sale: OfflineSale = {
                ...payload,
                clientReferenceId,
                billNumber: `BILL-${clientReferenceId}`,
                paidAmount,
                balanceDue,
                offlineCreatedAt: new Date().toISOString(),
                syncStatus: 'PENDING_SYNC',
                isOffline: true,
            };
            const updatedProducts = deductOfflineStock(state.products, payload.items);
            let updatedCustomers = state.customers;
            if (balanceDue > 0) {
                if (payload.paymentMode !== 'CREDIT')
                    throw new Error('An unpaid balance requires a credit sale.');
                const customer = state.customers.find(
                    (entry) => entry.id != null && entry.id === payload.customerId,
                );
                if (!customer || customer.creditLimit == null)
                    throw new Error(
                        'Customer credit details are unavailable offline. Refresh the customer first.',
                    );
                const creditBalance = addCreditBalance(
                    customer.creditBalance,
                    balanceDue,
                    customer.creditLimit,
                );
                updatedCustomers = state.customers.map((entry) =>
                    entry.id === customer.id ? { ...entry, creditBalance } : entry,
                );
            }
            state.queue.push(sale);
            state.history.unshift(sale);
            state.products = updatedProducts;
            state.customers = updatedCustomers;
            state.catalogRevision = (state.catalogRevision ?? 0) + 1;
            // One write commits the queue, receipt and stock. Failed writes propagate.
            await saveState(orgId, state);
            return sale;
        });
    },
    async getPendingQueue(orgId: number | string): Promise<OfflineSale[]> {
        return read(orgId, (state) => state.queue);
    },
    async discardOfflineSale(orgId: number | string, clientReferenceId: string): Promise<boolean> {
        const check = guard(orgId);
        return locked(orgId, async () => {
            check();
            const state = await readState(orgId);
            check();
            const queueIndex = state.queue.findIndex((q) => q.clientReferenceId === clientReferenceId);
            if (queueIndex === -1) return false;
            state.queue.splice(queueIndex, 1);
            state.history = state.history.filter((h) => h.clientReferenceId !== clientReferenceId);
            state.catalogRevision = (state.catalogRevision ?? 0) + 1;
            await saveState(orgId, state);
            return true;
        });
    },
    async cacheSalesHistory(orgId: number | string, sales: CachedSale[]) {
        const check = guard(orgId);
        await locked(orgId, async () => {
            check();
            const state = await readState(orgId);
            check();
            // A history request started before sync may omit its newly confirmed receipt.
            const recent = state.history.filter(
                (item) =>
                    item.syncStatus === 'SYNCED' &&
                    !sales.some(
                        (sale) =>
                            sale.id === item.id ||
                            (sale.clientReferenceId && sale.clientReferenceId === item.clientReferenceId),
                    ),
            );
            state.history = [
                ...state.queue,
                ...recent,
                ...sales.filter(
                    (sale) => !state.queue.some((q) => q.clientReferenceId === sale.clientReferenceId),
                ),
            ];
            await saveState(orgId, state);
        });
    },
    async getCachedSalesHistory(orgId: number | string): Promise<CachedSale[]> {
        try {
            return await read(orgId, (state) => state.history);
        } catch (error) {
            if (error instanceof OrganizationSessionChangedError) return [];
            throw error;
        }
    },
    processSyncQueue(orgId: number | string): Promise<SyncResult> {
        const key = String(orgId);
        const running = syncs.get(key);
        if (running) return running;
        const task = synchronize(orgId).finally(() => {
            if (syncs.get(key) === task) syncs.delete(key);
        });
        syncs.set(key, task);
        return task;
    },
};
async function synchronize(orgId: number | string): Promise<SyncResult> {
    let submittedCount = 0;
    try {
        const config = organizationRequestConfig(orgId);
        const queue = await syncService.getPendingQueue(orgId);
        submittedCount = queue.length;
        if (!queue.length) return { success: true, syncedCount: 0, failedCount: 0 };
        // Network work stays outside the storage lock so new sales can still be saved.
        const response = await api.post(
            '/sales/sync',
            queue.map((q) => ({
                clientReferenceId: q.clientReferenceId,
                customerId: q.customerId,
                customerName: q.customerName,
                paymentMode: q.paymentMode,
                paidAmount: q.paidAmount,
                initialPaymentMode: q.initialPaymentMode,
                discount: q.discount,
                taxType: q.taxType ?? 'INTRA_STATE',
                offlineCreatedAt: q.offlineCreatedAt,
                items: q.items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    ...(item.gstRate !== undefined ? { gstRate: item.gstRate } : {}),
                })),
            })),
            config,
        );
        if (!Array.isArray(response.data?.results))
            throw new Error('Invalid sync response. Pending invoices have been retained.');
        const submitted = new Set(queue.map((item) => item.clientReferenceId));
        return await locked(orgId, async () => {
            const state = await readState(orgId);
            let syncedCount = 0,
                failedCount = 0;
            let errorMessage: string | undefined;
            // Merge only this batch's acknowledgements into the CURRENT queue.
            state.queue = state.queue.filter((item) => {
                if (!submitted.has(item.clientReferenceId)) return true;
                const matches = response.data.results.filter(
                    (r: any) => r.clientReferenceId === item.clientReferenceId,
                );
                const result = matches.length === 1 ? matches[0] : null;
                if (result && ['SYNCED', 'ALREADY_SYNCED'].includes(result.status) && result.serverSaleId) {
                    const receipt = {
                        ...item,
                        ...result.sale,
                        id: result.serverSaleId,
                        billNumber: result.billNumber || result.sale?.billNumber || item.billNumber,
                        syncStatus: 'SYNCED',
                        isOffline: false,
                        errorMessage: undefined,
                    };
                    state.history = [
                        receipt,
                        ...state.history.filter((h) => h.clientReferenceId !== item.clientReferenceId),
                    ];
                    syncedCount++;
                    return false;
                }
                item.syncStatus = 'FAILED';
                item.errorMessage =
                    result?.errorMessage ||
                    'The server did not confirm this invoice. Retry sync to check it.';
                state.history = [
                    item,
                    ...state.history.filter((h) => h.clientReferenceId !== item.clientReferenceId),
                ];
                errorMessage ??= item.errorMessage;
                failedCount++;
                return true;
            });
            state.catalogRevision = (state.catalogRevision ?? 0) + 1;
            await saveState(orgId, state);
            return { success: failedCount === 0, syncedCount, failedCount, errorMessage };
        });
    } catch (error: any) {
        return {
            success: false,
            syncedCount: 0,
            failedCount: submittedCount,
            errorMessage:
                error?.response?.data?.message ||
                error?.message ||
                'Sync failed. Pending invoices have been retained.',
        };
    }
}
