// Customer balances have four-decimal storage precision; payments use paisa.
function units(value: string | number): bigint | null {
    const text = String(value).trim();
    if (text.length > 64) return null;
    const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(text);
    if (!match) return null;
    const fraction = match[3] ?? '';
    const exponent = Number(match[4] ?? 0);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 30) return null;
    const magnitude = BigInt(match[2] + fraction);
    const shift = 4 + exponent - fraction.length;
    const divisor = shift < 0 ? 10n ** BigInt(-shift) : 1n;
    if (magnitude % divisor !== 0n) return null;
    const result = shift < 0 ? magnitude / divisor : magnitude * 10n ** BigInt(shift);
    return match[1] ? -result : result;
}

const amount = (value: bigint) => Number(value) / 10000;

/** Use the same subtraction for the preview and the persisted offline balance. */
export function balanceAfterPayment(total: number, paid: number): number {
    const totalUnits = units(total);
    const paidUnits = units(paid);
    if (
        totalUnits === null ||
        paidUnits === null ||
        totalUnits < 0n ||
        paidUnits < 0n ||
        paidUnits > totalUnits ||
        totalUnits % 100n !== 0n ||
        paidUnits % 100n !== 0n
    )
        throw new Error('Invoice total and paid amount must be valid amounts in paisa, without overpayment.');
    return amount(totalUnits - paidUnits);
}

export function salePaymentAmounts(total: number, mode: string, paidInput: string = '') {
    const totalUnits = units(total);
    if (totalUnits === null || totalUnits < 0n || totalUnits % 100n !== 0n)
        return { paidAmount: 0, balanceDue: 0, valid: false };
    let paid = mode === 'CREDIT' || mode === 'PARTIAL' ? 0n : totalUnits;
    let valid = true;
    if (mode === 'PARTIAL') {
        const entered = /^\d+(\.\d{1,2})?$/.test(paidInput.trim()) ? units(paidInput) : null;
        valid = entered !== null && entered > 0n && entered < totalUnits;
        if (entered !== null && entered > 0n) paid = entered > totalUnits ? totalUnits : entered;
    }
    return { paidAmount: amount(paid), balanceDue: amount(totalUnits - paid), valid };
}

/** Null means customer amounts need refreshing, not an unlimited credit allowance. */
export function exceedsCreditLimit(balance: number, limit: number, due: number): boolean | null {
    const balanceUnits = units(balance);
    const limitUnits = units(limit);
    const dueUnits = units(due);
    if (balanceUnits === null || limitUnits === null || dueUnits === null || limitUnits < 0n || dueUnits < 0n)
        return null;
    return limitUnits > 0n && balanceUnits + dueUnits > limitUnits;
}

export function addCreditBalance(balance: number, due: number, limit?: number): number {
    const balanceUnits = units(balance);
    const dueUnits = units(due);
    if (balanceUnits === null || dueUnits === null || dueUnits < 0n)
        throw new Error('Customer balance is unavailable. Refresh the customer before saving.');
    if (limit !== undefined) {
        const exceeds = exceedsCreditLimit(balance, limit, due);
        if (exceeds === null) throw new Error('Customer credit limit is unavailable. Refresh the customer.');
        if (exceeds)
            throw new Error(
                'This sale exceeds the customer credit limit, including pending offline invoices.',
            );
    }
    return amount(balanceUnits + dueUnits);
}
