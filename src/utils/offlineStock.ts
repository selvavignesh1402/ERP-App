import type { Product } from '../types/business';

function quantityUnits(value: number): bigint {
    if (!Number.isFinite(value) || value < 0 || value >= 1e13)
        throw new Error('Stock quantity is invalid. Refresh the inventory before saving.');
    const fixed = value.toFixed(6);
    if (Number(fixed) !== value)
        throw new Error(
            'Stock quantities support at most six decimal places. Refresh or correct the quantity.',
        );
    return BigInt(fixed.replace('.', ''));
}

/** Apply each product's combined sale quantity once, without float subtraction. */
export function deductOfflineStock(
    products: Product[],
    items: { productId: number; quantity: number }[],
    refreshing = false,
): Product[] {
    const requested = new Map<number, bigint>();
    for (const item of items) {
        const units = quantityUnits(item.quantity);
        if (units === 0n) throw new Error('Sale quantity must be greater than zero.');
        requested.set(item.productId, (requested.get(item.productId) ?? 0n) + units);
    }
    return products.map((product) => {
        if (product.id === null) return product;
        const sold = requested.get(product.id);
        if (sold === undefined) return product;
        const stock = quantityUnits(product.stock);
        const available = product.availableStock == null ? null : quantityUnits(product.availableStock);
        if (!refreshing && (sold > stock || (available !== null && sold > available)))
            throw new Error(
                `Insufficient cached stock for ${product.productName || 'this product'}. Refresh the inventory.`,
            );
        return {
            ...product,
            stock: Number(stock > sold ? stock - sold : 0n) / 1000000,
            availableStock:
                available === null ? null : Number(available > sold ? available - sold : 0n) / 1000000,
        };
    });
}
