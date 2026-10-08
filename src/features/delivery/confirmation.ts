export interface ConfirmableDeliveryItem {
    product: { id: number; productName?: string };
    deliveringQuantity: number;
}

export function confirmationItems(items: ConfirmableDeliveryItem[], quantities: Record<number, string>) {
    if (items.length === 0) throw new Error('This delivery has no items. Refresh the delivery.');
    const seen = new Set<number>();
    return items.map((item) => {
        const id = item.product?.id;
        if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id))
            throw new Error('Delivery products are missing or repeated. Refresh the delivery.');
        seen.add(id);
        const limit = item.deliveringQuantity;
        if (!Number.isSafeInteger(limit) || limit < 0 || limit > 2147483647)
            throw new Error('Dispatch quantity is unavailable. Refresh the delivery.');
        const text = (quantities[id] ?? '').trim();
        const quantity = Number(text);
        if (!/^\d+$/.test(text) || !Number.isSafeInteger(quantity) || quantity > limit)
            throw new Error(
                `${item.product.productName || 'Product'}: enter a whole received quantity from 0 to ${limit}.`,
            );
        return { productId: id, deliveredQuantity: quantity };
    });
}
