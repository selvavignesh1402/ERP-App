export function receiptShopName(shop: any, organizationId: number): string | null {
    return Number(shop?.organizationId) === organizationId &&
        typeof shop?.name === 'string' &&
        shop.name.trim()
        ? shop.name.trim()
        : null;
}

export async function receiptForSharing(api: { get: (url: string) => Promise<any> }, sale: any) {
    if (sale.isOffline) return { bill: sale, items: sale.items || [] };
    const [bill, items] = await Promise.all([
        api.get(`/sales/${sale.id}`),
        api.get(`/sales/${sale.id}/items`),
    ]);
    return { bill: bill.data, items: items.data || [] };
}

export interface ReceiptDisplayOptions {
    showLogo?: boolean;
    showGst?: boolean;
    showCustomer?: boolean;
    showPayment?: boolean;
    showThanks?: boolean;
}

export function receiptShareText(
    shopName: string | null,
    bill: any,
    items: any[],
    duplicate: boolean,
    options?: ReceiptDisplayOptions,
): string {
    shopName = bill.shopName || shopName;
    if (!shopName)
        throw new Error('Shop details are unavailable. Reopen sales while connected before sharing.');
    if (!items.length) throw new Error('Invoice items are unavailable. Reopen the invoice before sharing.');
    const total = Number(bill.grandTotal) || 0;
    const paid = bill.paidAmount ?? (bill.paymentMode === 'CREDIT' ? 0 : total);
    const balance = bill.balanceDue ?? Math.max(0, total - Number(paid));
    const lines = items
        .map((item) => {
            const qty = Number(item.quantity) || 0,
                price = Number(item.price) || 0;
            return `${item.productName || item.product?.productName || 'Product'} x ${qty} = ₹${(qty * price).toFixed(2)}`;
        })
        .join('\n');

    const showLogo = options?.showLogo ?? true;
    const showCustomer = options?.showCustomer ?? true;
    const showPayment = options?.showPayment ?? true;
    const showThanks = options?.showThanks ?? true;

    const parts: string[] = [];
    if (showLogo) {
        parts.push(shopName);
    }
    parts.push(`Invoice: ${bill.billNumber || `INV-${bill.id}`}${duplicate ? ' (DUPLICATE)' : ''}`);
    if (bill.isOffline) {
        parts.push('Pending synchronization');
    }
    if (!bill.isOffline && !bill.shopName) {
        parts.push('Original identity details were not saved; current master details may be shown.');
    }
    if (showCustomer) {
        parts.push(`Customer: ${bill.customerName || bill.customer?.customerName || 'Walk-in Customer'}`);
    }
    parts.push(`Date: ${bill.saleDate ? new Date(bill.saleDate).toLocaleString('en-IN') : 'Unavailable'}`);
    parts.push(`-----------------------------\n${lines}\n-----------------------------`);
    parts.push(`Total Amount: ₹${total.toFixed(2)}`);
    if (showPayment) {
        parts.push(`Paid: ₹${Number(paid).toFixed(2)} | Balance due: ₹${Number(balance).toFixed(2)}`);
    }
    if (showThanks) {
        parts.push('Thank you for your business!');
    }

    return parts.join('\n');
}
