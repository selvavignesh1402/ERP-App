export interface DispatchableItem {
    product: { id: number; productName?: string };
    availableQuantity: number;
}

export function dispatchItems(items: DispatchableItem[], quantities: Record<number, string>) {
    const seen = new Set<number>();
    const result = items
        .map((item) => {
            const id = item.product?.id;
            if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id))
                throw new Error('Order products are missing or repeated. Refresh the order.');
            seen.add(id);
            const limit = item.availableQuantity;
            if (!Number.isSafeInteger(limit) || limit < 0 || limit > 2147483647)
                throw new Error('Available dispatch quantity is invalid. Refresh the order.');
            const text = (quantities[id] ?? '').trim();
            const quantity = Number(text);
            if (!/^\d+$/.test(text) || !Number.isSafeInteger(quantity) || quantity > limit)
                throw new Error(
                    `${item.product.productName || 'Product'}: enter a whole dispatch quantity from 0 to ${limit}.`,
                );
            return { productId: id, deliveringQuantity: quantity };
        })
        .filter((item) => item.deliveringQuantity > 0);
    if (result.length === 0)
        throw new Error('Enter a dispatch quantity greater than 0 for at least one product.');
    return result;
}
