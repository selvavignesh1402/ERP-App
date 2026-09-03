import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export interface OfflineSaleItem {
    productId: number;
    productName: string;
    brand?: string;
    unit?: string;
    quantity: number;
    price: number;
}

export interface OfflineSale {
    clientReferenceId: string;
    billNumber: string;
    customerId?: number | null;
    customerName: string;
    paymentMode: string;
    discount: number;
    total: number;
    cgst: number;
    sgst: number;
    grandTotal: number;
    items: OfflineSaleItem[];
    offlineCreatedAt: string;
    syncStatus: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
    serverSaleId?: number;
    errorMessage?: string;
    isOffline: boolean;
}

const getProductsKey = (orgId: number | string) => `@offline_products_${orgId}`;
const getCustomersKey = (orgId: number | string) => `@offline_customers_${orgId}`;
const getQueueKey = (orgId: number | string) => `@offline_sales_queue_${orgId}`;
const getHistoryKey = (orgId: number | string) => `@offline_sales_history_${orgId}`;
const getMetaKey = (orgId: number | string) => `@offline_meta_${orgId}`;

export const syncService = {
    // 1. Cache Products and Customers locally
    async cacheCatalog(orgId: number | string, products: any[], customers: any[]) {
        try {
            if (products && products.length > 0) {
                await AsyncStorage.setItem(getProductsKey(orgId), JSON.stringify(products));
            }
            if (customers && customers.length > 0) {
                await AsyncStorage.setItem(getCustomersKey(orgId), JSON.stringify(customers));
            }
            await AsyncStorage.setItem(getMetaKey(orgId), JSON.stringify({ lastCatalogUpdate: new Date().toISOString() }));
        } catch (e) {
            console.error('Failed to cache catalog locally:', e);
        }
    },

    // 2. Retrieve cached catalog
    async getCachedCatalog(orgId: number | string): Promise<{ products: any[]; customers: any[] }> {
        try {
            const [prodRaw, custRaw] = await Promise.all([
                AsyncStorage.getItem(getProductsKey(orgId)),
                AsyncStorage.getItem(getCustomersKey(orgId)),
            ]);

            return {
                products: prodRaw ? JSON.parse(prodRaw) : [],
                customers: custRaw ? JSON.parse(custRaw) : [],
            };
        } catch (e) {
            console.error('Failed to read cached catalog:', e);
            return { products: [], customers: [] };
        }
    },

    // 3. Create Offline Sale & deduct local stock optimistically
    async createOfflineSale(
        orgId: number | string,
        payload: {
            customerId?: number | null;
            customerName: string;
            paymentMode: string;
            discount: number;
            total: number;
            cgst: number;
            sgst: number;
            grandTotal: number;
            items: OfflineSaleItem[];
        }
    ): Promise<OfflineSale> {
        const clientReferenceId = `OFF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const offlineBillNumber = `BILL-OFFLINE-${Math.floor(1000 + Math.random() * 9000)}`;

        const offlineSale: OfflineSale = {
            clientReferenceId,
            billNumber: offlineBillNumber,
            customerId: payload.customerId,
            customerName: payload.customerName,
            paymentMode: payload.paymentMode,
            discount: payload.discount,
            total: payload.total,
            cgst: payload.cgst,
            sgst: payload.sgst,
            grandTotal: payload.grandTotal,
            items: payload.items,
            offlineCreatedAt: new Date().toISOString(),
            syncStatus: 'PENDING_SYNC',
            isOffline: true,
        };

        // A. Add to pending sync queue
        try {
            const existingQueueRaw = await AsyncStorage.getItem(getQueueKey(orgId));
            const queue: OfflineSale[] = existingQueueRaw ? JSON.parse(existingQueueRaw) : [];
            queue.push(offlineSale);
            await AsyncStorage.setItem(getQueueKey(orgId), JSON.stringify(queue));

            // B. Add to local sales history cache
            const historyRaw = await AsyncStorage.getItem(getHistoryKey(orgId));
            const history: any[] = historyRaw ? JSON.parse(historyRaw) : [];
            history.unshift(offlineSale);
            await AsyncStorage.setItem(getHistoryKey(orgId), JSON.stringify(history));

            // C. Optimistically update local cached product stock
            const prodRaw = await AsyncStorage.getItem(getProductsKey(orgId));
            if (prodRaw) {
                const products: any[] = JSON.parse(prodRaw);
                const updatedProducts = products.map((p) => {
                    const matched = payload.items.find((it) => it.productId === p.id);
                    if (matched) {
                        return { ...p, stock: Math.max(0, (p.stock || 0) - matched.quantity) };
                    }
                    return p;
                });
                await AsyncStorage.setItem(getProductsKey(orgId), JSON.stringify(updatedProducts));
            }
        } catch (e) {
            console.error('Error storing offline sale:', e);
        }

        return offlineSale;
    },

    // 4. Get Pending Sync Queue
    async getPendingQueue(orgId: number | string): Promise<OfflineSale[]> {
        try {
            const raw = await AsyncStorage.getItem(getQueueKey(orgId));
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    // 5. Cache remote sales history locally
    async cacheSalesHistory(orgId: number | string, sales: any[]) {
        try {
            const queue = await this.getPendingQueue(orgId);
            // Combine pending offline sales at top with server sales
            const merged = [...queue, ...sales.filter((s) => !queue.some((q) => q.clientReferenceId === s.clientReferenceId))];
            await AsyncStorage.setItem(getHistoryKey(orgId), JSON.stringify(merged));
        } catch (e) {
            console.error('Error caching sales history:', e);
        }
    },

    // 6. Get cached sales history
    async getCachedSalesHistory(orgId: number | string): Promise<any[]> {
        try {
            const raw = await AsyncStorage.getItem(getHistoryKey(orgId));
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    // 7. Process & Synchronize Queue to Backend
    async processSyncQueue(orgId: number | string): Promise<{ success: boolean; syncedCount: number; failedCount: number }> {
        try {
            const queue = await this.getPendingQueue(orgId);
            if (queue.length === 0) {
                return { success: true, syncedCount: 0, failedCount: 0 };
            }

            // Format batch payload
            const batchPayload = queue.map((q) => ({
                clientReferenceId: q.clientReferenceId,
                customerId: q.customerId,
                customerName: q.customerName,
                paymentMode: q.paymentMode,
                discount: q.discount,
                offlineCreatedAt: q.offlineCreatedAt,
                items: q.items.map((it) => ({
                    productId: it.productId,
                    quantity: it.quantity,
                    price: it.price,
                })),
            }));

            const response = await api.post('/sales/sync', batchPayload);
            const syncResult = response.data;

            if (syncResult && syncResult.results) {
                const results: any[] = syncResult.results;
                const remainingQueue: OfflineSale[] = [];

                // Read history to update server IDs
                const historyRaw = await AsyncStorage.getItem(getHistoryKey(orgId));
                let history: any[] = historyRaw ? JSON.parse(historyRaw) : [];

                for (const item of queue) {
                    const resMatch = results.find((r: any) => r.clientReferenceId === item.clientReferenceId);
                    if (resMatch && (resMatch.status === 'SYNCED' || resMatch.status === 'ALREADY_SYNCED')) {
                        // Mark as synced in history
                        history = history.map((h) => {
                            if (h.clientReferenceId === item.clientReferenceId) {
                                return {
                                    ...h,
                                    id: resMatch.serverSaleId || h.id,
                                    billNumber: resMatch.billNumber || h.billNumber,
                                    syncStatus: 'SYNCED',
                                    isOffline: false,
                                };
                            }
                            return h;
                        });
                    } else {
                        // Keep failed items in queue for retry
                        remainingQueue.push({
                            ...item,
                            syncStatus: 'FAILED',
                            errorMessage: resMatch?.errorMessage || 'Sync failed',
                        });
                    }
                }

                // Update AsyncStorage
                await AsyncStorage.setItem(getQueueKey(orgId), JSON.stringify(remainingQueue));
                await AsyncStorage.setItem(getHistoryKey(orgId), JSON.stringify(history));

                return {
                    success: true,
                    syncedCount: (syncResult.successCount || 0) + (syncResult.duplicateCount || 0),
                    failedCount: syncResult.failureCount || remainingQueue.length,
                };
            }

            return { success: false, syncedCount: 0, failedCount: queue.length };
        } catch (error) {
            console.error('Error during batch sync:', error);
            return { success: false, syncedCount: 0, failedCount: 0 };
        }
    },
};
