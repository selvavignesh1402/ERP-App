// Preview only. The server validates receipt totals again inside its transaction.
export function purchaseReceiptRows(ordered: any[], received: Record<number, number>) {
    const groups = new Map<
        number,
        { productId: number; productName: string; quantity: number; amount: number }
    >();
    for (const line of ordered) {
        const id = line.product.id;
        const group = groups.get(id) || {
            productId: id,
            productName: line.product.productName,
            quantity: 0,
            amount: 0,
        };
        group.quantity += Number(line.quantity);
        group.amount += Number(line.quantity) * Number(line.price);
        groups.set(id, group);
    }
    return Array.from(groups.values()).map((group) => {
        // Remove insignificant binary floating point tails from display/input defaults.
        const orderedQty = Number(group.quantity.toPrecision(15));
        const alreadyReceived = Number((received[group.productId] || 0).toPrecision(15));
        const remaining = Number(Math.max(0, orderedQty - alreadyReceived).toPrecision(15));
        return {
            productId: group.productId,
            productName: group.productName,
            orderedQty,
            alreadyReceived,
            remaining,
            receivedQty: String(remaining),
            unitPrice: group.amount / group.quantity,
        };
    });
}
