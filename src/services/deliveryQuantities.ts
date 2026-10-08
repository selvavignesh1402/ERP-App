// Preview only: the server rechecks allocations under its transaction lock.
export function availableToDispatch(order: any, item: any, deliveries: any[]): number {
    const reserved = deliveries
        .filter(
            (note) =>
                String(note.salesOrder?.id) === String(order.id) &&
                ['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(note.status),
        )
        .flatMap((note) => note.items || [])
        .filter((line) => String(line.product?.id) === String(item.product?.id))
        .reduce((sum, line) => sum + Number(line.deliveringQuantity || 0), 0);
    return Math.max(0, Number(item.orderedQuantity || 0) - Number(item.deliveredQuantity || 0) - reserved);
}
