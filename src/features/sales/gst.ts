export type TaxType = 'INTRA_STATE' | 'INTER_STATE';
export const GST_RATES = [5, 18, 40, 0.25, 1.5, 3] as const;

/** Parse supported decimal input without first converting its digits to a float.
 * Blank/invalid draft fields contribute zero until the form is completed.
 */
function units(input: string | number, places: number): bigint {
    const text = String(input).trim();
    if (text.length > 64) return 0n;
    const match = /^((?:\d+(?:\.\d*)?|\.\d+))(?:e([+-]?\d+))?$/i.exec(text);
    if (!match) return 0n;
    const [whole, fraction = ''] = match[1].split('.');
    const exponent = Number(match[2] ?? 0);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 30) return 0n;
    const digits = BigInt((whole || '0') + fraction);
    const shift = places + exponent - fraction.length;
    if (shift >= 0) return digits * 10n ** BigInt(shift);
    const divisor = 10n ** BigInt(-shift);
    return digits % divisor === 0n ? digits / divisor : 0n;
}

/** All amounts here are non-negative; ties round up, as on the backend. */
function roundedDivide(numerator: bigint, denominator: bigint): bigint {
    return (numerator * 2n + denominator) / (denominator * 2n);
}

/** Preview uses the same rate buckets and proportional discount as the server. */
export function calculateGst(
    lines: { quantity: string | number; price: string | number; gstRate?: number | null }[],
    discount: string | number,
    type: TaxType,
) {
    // Quantity has six decimal places and price four, so line amounts have ten.
    const amountToCents = 100000000n;
    const buckets = new Map<bigint, bigint>();
    let subtotal = 0n;
    for (const line of lines) {
        const amount = units(line.quantity, 6) * units(line.price, 4);
        subtotal += amount;
        const rate = units(line.gstRate ?? 0, 2);
        buckets.set(rate, (buckets.get(rate) ?? 0n) + amount);
    }
    const discounted = subtotal - units(discount, 4) * 1000000n;
    const discountExceedsSubtotal = discounted < 0n;
    const net = discounted > 0n ? discounted : 0n;
    let component = 0n;
    if (subtotal > 0n) {
        for (const [rate, amount] of buckets) {
            component += roundedDivide(
                amount * net * rate,
                subtotal * (type === 'INTER_STATE' ? 10000n : 20000n) * amountToCents,
            );
        }
    }
    // Keep existing numeric UI/API contracts; only convert final rounded cents.
    const asAmount = (cents: bigint) => Number(cents) / 100;
    const cgst = type === 'INTRA_STATE' ? asAmount(component) : 0;
    const sgst = cgst;
    const igst = type === 'INTER_STATE' ? asAmount(component) : 0;
    const tax = component * (type === 'INTRA_STATE' ? 2n : 1n);
    return {
        subtotal: asAmount(roundedDivide(subtotal, amountToCents)),
        cgst,
        sgst,
        igst,
        grandTotal: asAmount(roundedDivide(net, amountToCents) + tax),
        discountExceedsSubtotal,
    };
}
