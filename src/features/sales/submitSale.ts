import type { Customer, Sale, SalesOrder } from '../../types/business';
import type { CachedSale, OfflineSaleItem, syncService as offlineService } from '../../services/syncService';
import { OrganizationSessionChangedError } from '../../services/api';
import { salePaymentAmounts, exceedsCreditLimit } from '../../utils/paymentAmounts';

export interface SaleLineInput {
    productId: number | null;
    productName: string;
    brand?: string;
    bagSizeKg?: number;
    quantity: string;
    price: string;
    stock: number;
    gstRate?: number | null;
}
export interface SaleSubmissionContext {
    lineItems: SaleLineInput[];
    orderBookingMode: 'SALES_ORDER' | 'INSTANT_INVOICE';
    selectedCustomer: Customer | null;
    paymentMode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'PARTIAL';
    initialPaymentMode: 'CASH' | 'UPI' | 'CARD';
    expectedDeliveryDate: string;
    orderNotes: string;
    paidAmountInput: string;
    customerSearch: string;
    discountValue: number;
    discountInput?: string;
    calculatedGrandTotal: number;
    effectiveBalanceDue: number;
    effectivePaidAmount: number;
    calculatedSubtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount?: number;
    taxType?: 'INTRA_STATE' | 'INTER_STATE';
    activeOrgId: number;
    isOnline: boolean;
    Alert: { alert(title: string, message: string, buttons?: { text: string; onPress(): void }[]): void };
    api: { post<T>(url: string, data: unknown): Promise<{ data: T }> };
    syncService: Pick<typeof offlineService, 'createOfflineSale'>;
    setSubmitting(value: boolean): void;
    setSelectedBill(value: CachedSale & { customer?: Customer | null; paymentMode: string }): void;
    setBillItems(value: OfflineSaleItem[]): void;
    setIsReprintMode(value: boolean): void;
    setCreateModalVisible(value: boolean): void;
    setBillModalVisible(value: boolean): void;
    setSalesList(update: (previous: CachedSale[]) => CachedSale[]): void;
    fetchSales(): unknown;
    fetchSalesOrders(): unknown;
    refreshPendingCount(): Promise<unknown>;
}

function decimalInput(raw: string, places: number, maximum: number, label: string, allowZero = false) {
    const text = raw.trim();
    const match = /^(\d+)(?:\.(\d*))?$|^\.(\d+)$/.exec(text);
    if (!match || text.length > 64) throw new Error(`${label}: enter a complete number.`);
    const whole = match[1] ?? '0';
    const fraction = (match[2] ?? match[3] ?? '').replace(/0+$/, '');
    const value = Number(text);
    if (
        fraction.length > places ||
        !Number.isFinite(value) ||
        value < 0 ||
        (!allowZero && value === 0) ||
        value >= maximum
    )
        throw new Error(
            `${label}: enter ${allowZero ? 'zero or a positive' : 'a positive'} amount within the supported range, with at most ${places} decimal places.`,
        );
    const scaled = BigInt(whole + fraction.padEnd(places, '0'));
    // Numeric JSON cannot carry every large decimal. Reject rather than silently change it.
    if (BigInt(value.toFixed(places).replace('.', '')) !== scaled)
        throw new Error(`${label}: this value is too precise to send safely. Use a smaller value.`);
    return { value, scaled };
}

/** A submission never falls back to a second write after an ambiguous online result. */
export async function submitSale(context: SaleSubmissionContext): Promise<void> {
    const {
        lineItems,
        orderBookingMode,
        selectedCustomer,
        paymentMode,
        expectedDeliveryDate,
        discountValue: suppliedDiscount,
        orderNotes,
        paidAmountInput,
        calculatedGrandTotal,
        initialPaymentMode,
        customerSearch,
        activeOrgId,
        calculatedSubtotal,
        cgstAmount,
        sgstAmount,
        igstAmount = 0,
        taxType = 'INTRA_STATE',
        isOnline,
        Alert,
        api,
        syncService,
        setSubmitting,
        setSelectedBill,
        setBillItems,
        setIsReprintMode,
        setCreateModalVisible,
        setBillModalVisible,
        setSalesList,
        fetchSales,
        fetchSalesOrders,
        refreshPendingCount,
    } = context;
    const selectedItems = lineItems.filter(
        (it): it is SaleLineInput & { productId: number } => it.productId != null,
    );
    if (selectedItems.length === 0) {
        Alert.alert('Missing Products', 'Please select at least one product and enter a valid quantity.');
        return;
    }
    const isOrder = orderBookingMode === 'SALES_ORDER';
    let validItems;
    let discountValue: number;
    try {
        let subtotal = 0n;
        validItems = selectedItems.map((item, index) => {
            if (!Number.isSafeInteger(item.productId) || item.productId <= 0)
                throw new Error(`Item ${index + 1}: select a valid product.`);
            const quantity = decimalInput(
                item.quantity,
                isOrder ? 0 : 6,
                isOrder ? 2147483648 : 1e13,
                `Item ${index + 1} quantity`,
            );
            const price = decimalInput(item.price, isOrder ? 2 : 4, 1e15, `Item ${index + 1} price`);
            subtotal += quantity.scaled * price.scaled;
            return { ...item, parsedQuantity: quantity.value, parsedPrice: price.value };
        });
        const rawDiscount = context.discountInput ?? String(suppliedDiscount);
        const discount = decimalInput(rawDiscount.trim() || '0', isOrder ? 2 : 4, 1e15, 'Discount', true);
        // Invoice lines have ten decimal places; order lines have two.
        if (discount.scaled * (isOrder ? 1n : 1000000n) > subtotal)
            throw new Error('Discount cannot exceed the total of the selected items.');
        discountValue = discount.value;
    } catch (error) {
        Alert.alert(
            'Invalid Sale Details',
            error instanceof Error ? error.message : 'Check the item quantities and prices.',
        );
        return;
    }

    const consolidatedItems: typeof validItems = [];
    const seenIndices = new Map<number, number>();
    for (const item of validItems) {
        const existingIdx = seenIndices.get(item.productId);
        if (existingIdx === undefined) {
            seenIndices.set(item.productId, consolidatedItems.length);
            consolidatedItems.push({ ...item });
        } else {
            const existing = consolidatedItems[existingIdx];
            const combinedQty = existing.parsedQuantity + item.parsedQuantity;
            const totalAmount =
                existing.parsedQuantity * existing.parsedPrice +
                item.parsedQuantity * item.parsedPrice;
            const weightedPrice = combinedQty > 0 ? totalAmount / combinedQty : existing.parsedPrice;
            consolidatedItems[existingIdx] = {
                ...existing,
                parsedQuantity: combinedQty,
                parsedPrice: isOrder
                    ? Number(weightedPrice.toFixed(2))
                    : Number(weightedPrice.toFixed(4)),
            };
        }
    }

    if (orderBookingMode === 'SALES_ORDER') {
        if (!selectedCustomer) {
            Alert.alert('Customer Required', 'Please select a customer to book a Sales Order.');
            return;
        }
        setSubmitting(true);
        try {
            const tomDate = new Date();
            tomDate.setDate(tomDate.getDate() + 1);
            const tomorrow = `${tomDate.getFullYear()}-${String(tomDate.getMonth() + 1).padStart(2, '0')}-${String(tomDate.getDate()).padStart(2, '0')}`;
            const payload = {
                customerId: selectedCustomer.id,
                expectedDeliveryDate: expectedDeliveryDate || tomorrow,
                discount: discountValue,
                taxType,
                notes: (orderNotes || '').trim(),
                items: consolidatedItems.map((it) => ({
                    productId: it.productId,
                    quantity: it.parsedQuantity,
                    unitPrice: it.parsedPrice,
                    gstRate: it.gstRate ?? null,
                })),
            };
            const res = await api.post<SalesOrder>('/api/sales-orders', payload);
            Alert.alert(
                'Sales Order Placed! 📦',
                `Order ${res.data.orderNumber} successfully booked for ${selectedCustomer.customerName}.\nIt has been queued in Warehouse Fulfillment for packing & delivery dispatch.`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setCreateModalVisible(false);
                            fetchSalesOrders();
                        },
                    },
                ],
            );
        } catch (err: any) {
            Alert.alert('Order Booking Failed', err.response?.data?.message || 'Could not place sales order');
        } finally {
            setSubmitting(false);
        }
        return;
    }

    if ((paymentMode === 'CREDIT' || paymentMode === 'PARTIAL') && !selectedCustomer) {
        Alert.alert(
            'Customer Required',
            'Please select a registered customer for Credit / Partial payment tracking.',
        );
        return;
    }

    const {
        paidAmount: effectivePaidAmount,
        balanceDue: effectiveBalanceDue,
        valid,
    } = salePaymentAmounts(calculatedGrandTotal, paymentMode, paidAmountInput);
    if (!valid) {
        Alert.alert(
            paymentMode === 'PARTIAL' ? 'Invalid Paid Amount' : 'Invalid Invoice Total',
            paymentMode === 'PARTIAL'
                ? 'Enter an amount greater than zero and less than the invoice total, with at most two decimal places.'
                : 'Check the invoice amounts before submitting this sale.',
        );
        return;
    }

    if ((paymentMode === 'CREDIT' || paymentMode === 'PARTIAL') && selectedCustomer) {
        const limit = selectedCustomer.creditLimit;
        const balance = selectedCustomer.creditBalance;
        const exceeds = exceedsCreditLimit(balance, limit, effectiveBalanceDue);
        if (exceeds === null) {
            Alert.alert(
                'Customer Balance Unavailable',
                'Refresh the customer balance and credit limit before creating this sale.',
            );
            return;
        }
        if (exceeds) {
            Alert.alert(
                'Credit Limit Exceeded',
                `This customer's limit is ₹${limit.toLocaleString('en-IN')}.\nCurrent balance: ₹${balance.toLocaleString('en-IN')}.\nAdding remaining balance of ₹${effectiveBalanceDue.toFixed(2)} exceeds the credit limit!`,
            );
            return;
        }
    }

    setSubmitting(true);
    const enrichedItems = consolidatedItems.map((it) => ({
        id: it.productId,
        productId: it.productId,
        productName: it.productName,
        brand: it.brand,
        bagSizeKg: it.bagSizeKg || 25,
        unit: 'Bag',
        quantity: it.parsedQuantity,
        price: it.parsedPrice,
        gstRate: it.gstRate ?? null,
    }));

    try {
        if (isOnline) {
            const response = await api.post<Sale>('/sales', {
                customerId: selectedCustomer?.id ?? null,
                customerName: selectedCustomer?.customerName || customerSearch.trim() || 'Walk-in Guest',
                paymentMode: paymentMode === 'PARTIAL' ? 'CREDIT' : paymentMode,
                paidAmount: paymentMode === 'PARTIAL' ? effectivePaidAmount : undefined,
                initialPaymentMode: paymentMode === 'PARTIAL' ? initialPaymentMode : undefined,
                discount: discountValue,
                taxType,
                items: consolidatedItems.map((it) => ({
                    productId: it.productId,
                    quantity: it.parsedQuantity,
                    price: it.parsedPrice,
                    gstRate: it.gstRate ?? null,
                })),
            });

            const createdSale = response.data;
            const enrichedBill = {
                ...createdSale,
                customer: selectedCustomer || createdSale.customer,
                customerName:
                    selectedCustomer?.customerName ||
                    createdSale.customerName ||
                    customerSearch.trim() ||
                    'Walk-in Guest',
                paymentMode,
                syncStatus: 'SYNCED' as const,
                isOffline: false,
            };

            setSelectedBill(enrichedBill);
            setBillItems(enrichedItems);
            setIsReprintMode(false);
            setCreateModalVisible(false);
            setBillModalVisible(true);
            fetchSales();
        } else {
            // Device is Offline -> Create local offline sale
            const offlineSale = await syncService.createOfflineSale(activeOrgId, {
                customerId: selectedCustomer?.id ?? null,
                customerName: selectedCustomer?.customerName || customerSearch.trim() || 'Walk-in Guest',
                paymentMode: paymentMode === 'PARTIAL' ? 'CREDIT' : paymentMode,
                paidAmount: paymentMode === 'PARTIAL' ? effectivePaidAmount : undefined,
                initialPaymentMode: paymentMode === 'PARTIAL' ? initialPaymentMode : undefined,
                discount: discountValue,
                taxType,
                total: calculatedSubtotal,
                cgst: cgstAmount,
                sgst: sgstAmount,
                igst: igstAmount,
                grandTotal: calculatedGrandTotal,
                items: enrichedItems,
            });

            const enrichedBill = {
                ...offlineSale,
                customer: selectedCustomer,
                customerName: selectedCustomer?.customerName || customerSearch.trim() || 'Walk-in Guest',
                paymentMode,
            };

            setSelectedBill(enrichedBill);
            setBillItems(enrichedItems);
            setIsReprintMode(false);
            setCreateModalVisible(false);
            setBillModalVisible(true);
            setSalesList((prev) => [offlineSale, ...prev]);
            await refreshPendingCount();
        }
    } catch (error: any) {
        // An online request may be rejected or may have committed before the
        // connection failed. Neither outcome authorizes a second offline sale.
        if (error instanceof OrganizationSessionChangedError) {
            Alert.alert('Shop Changed', 'Reopen sales for the selected shop before creating this invoice.');
        } else if (!isOnline) {
            Alert.alert(
                'Offline Save Failed',
                'Could not confirm the offline save. Check pending sales before trying again.',
            );
        } else {
            const status = error?.response?.status;
            if (status >= 400 && status < 500 && status !== 408) {
                Alert.alert(
                    'Sale Not Saved',
                    error?.response?.data?.message ||
                        (status === 401
                            ? 'Please sign in again.'
                            : status === 403
                              ? 'You do not have permission to create this sale.'
                              : 'The server rejected this sale. Review the details before trying again.'),
                );
            } else {
                Alert.alert(
                    'Sale Not Confirmed',
                    'The sale may already have been saved. Reconnect and check your sales history before submitting it again.',
                );
            }
        }
    } finally {
        setSubmitting(false);
    }
}
