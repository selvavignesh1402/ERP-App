import type { Product } from '../../types/business';

export interface ProductForm {
    name: string;
    brand: string;
    category: string;
    weight: string;
    purchasePrice: string;
    sellingPrice: string;
    stock: string;
    minimumStock: string;
    gstRate: number | null;
    hsnCode: string;
}

export type ProductPayload = Pick<
    Product,
    | 'productName'
    | 'brand'
    | 'category'
    | 'unit'
    | 'purchasePrice'
    | 'sellingPrice'
    | 'stock'
    | 'minimumStock'
    | 'gstRate'
    | 'hsnCode'
>;

/** Parse the entire input, never a numeric prefix, and reject silent database rounding. */
function decimal(input: string, label: string, scale: number, positive = false): number {
    const text = input.trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))
        throw new Error(`${label}: enter a valid ${positive ? 'positive' : 'non-negative'} number.`);
    const fraction = (text.split('.')[1] ?? '').replace(/0+$/, '');
    if (fraction.length > scale) throw new Error(`${label}: use at most ${scale} decimal places.`);
    const value = Number(text);
    const maximum = scale === 6 ? 1e13 : 1e15;
    if (!Number.isFinite(value) || value >= maximum || (positive && value <= 0))
        throw new Error(
            `${label}: the amount must be ${positive ? 'greater than zero and ' : ''}within the supported range.`,
        );
    const whole = text.split('.')[0].replace(/^0+/, '') || '0';
    const normalized = `${whole}${fraction ? '.' + fraction : ''}`;
    if (String(value) !== normalized)
        throw new Error(`${label}: this number is too precise to send without rounding.`);
    return value;
}

export function buildProductPayload(form: ProductForm): ProductPayload {
    if (!form.name.trim()) throw new Error('Product name is required.');
    if (!form.category.trim()) throw new Error('Category is required.');
    const weight = decimal(form.weight, 'Bag weight', 6, true);
    return {
        productName: form.name.trim(),
        brand: form.brand.trim() || 'General',
        category: form.category.trim(),
        unit: `${weight}kg`,
        purchasePrice: decimal(form.purchasePrice, 'Purchase price', 4),
        sellingPrice: decimal(form.sellingPrice, 'Selling price', 4, true),
        stock: decimal(form.stock.trim() || '0', 'Initial stock', 6),
        minimumStock: decimal(form.minimumStock.trim() || '10', 'Minimum stock', 6),
        gstRate: form.gstRate,
        hsnCode: form.hsnCode.trim() || null,
    };
}

export function adjustmentPayload(
    id: string,
    quantity: string,
    deduct: boolean,
    reason: string,
    notes: string,
) {
    const amount = decimal(quantity, 'Adjustment quantity', 6, true);
    // The backend stores one reason field, not a separate notes field.
    const explanation = notes.trim() ? `${reason}: ${notes.trim()}` : reason;
    if (explanation.length > 255) throw new Error('Reason and remarks must fit within 255 characters.');
    return { productId: Number(id), quantityChange: deduct ? -amount : amount, reason: explanation };
}

export function toInventoryItem(product: Product) {
    if (product.id === null || !product.productName) throw new Error('Product identity is missing.');
    return {
        id: String(product.id),
        name: `${product.brand ? product.brand + ' ' : ''}${product.productName}`,
        productName: product.productName,
        brand: product.brand || '',
        category: product.category || 'Other',
        supplier: 'Local Supplier',
        price: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        stock: product.stock,
        minimumStock: product.minimumStock,
        unit: product.unit || '',
        hsnCode: product.hsnCode || '',
        gstRate: product.gstRate || null,
    };
}

export type InventoryItem = ReturnType<typeof toInventoryItem>;

export function inventoryError(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null || !('response' in error)) return fallback;
    const response = error.response;
    if (typeof response !== 'object' || response === null || !('data' in response)) return fallback;
    const data = response.data;
    return typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
        ? data.message
        : fallback;
}
