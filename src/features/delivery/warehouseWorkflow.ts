interface WarehouseOrder {
    id?: number;
    status?: string;
}
interface ActiveTrip {
    salesOrder?: { id?: number } | null;
    status?: string;
}
export type WarehouseFilter = 'ALL' | 'NEW' | 'READY' | 'DELIVERED';

export function warehouseWorkflow(order: WarehouseOrder, trips: ActiveTrip[] = []) {
    const active =
        order.id != null &&
        trips.some(
            (trip) =>
                String(trip.salesOrder?.id) === String(order.id) &&
                ['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(trip.status ?? ''),
        );
    const canPack =
        ['CONFIRMED', 'PROCESSING', 'PARTIALLY_DELIVERED'].includes(order.status ?? '') && !active;
    const canAssign = order.status === 'READY_FOR_DELIVERY';
    const delivered = order.status === 'DELIVERED';
    const labels: Record<string, string> = {
        DRAFT: 'Draft',
        CONFIRMED: 'To Pack',
        PROCESSING: 'Processing',
        READY_FOR_DELIVERY: 'Ready to Ship',
        OUT_FOR_DELIVERY: 'Out for Delivery',
        PARTIALLY_DELIVERED: 'Partially Delivered',
        DELIVERED: 'Delivered',
        CANCELLED: 'Cancelled',
    };
    return {
        canPack,
        canAssign,
        delivered,
        label: Object.prototype.hasOwnProperty.call(labels, order.status ?? '')
            ? labels[order.status!]
            : 'Unknown Status',
        explanation: active
            ? 'This order has an active delivery. Check Driver Trips before changing its packing status.'
            : order.status === 'DRAFT'
              ? 'Confirm this order in Sales Orders before packing.'
              : delivered
                ? 'This order has been delivered. Check Driver Trips for delivery details.'
                : 'This order cannot be packed from its current status. Refresh the order before continuing.',
    };
}

export function matchesWarehouseFilter(
    order: WarehouseOrder,
    filter: WarehouseFilter,
    trips: ActiveTrip[] = [],
) {
    if (order.status === 'CANCELLED') return false;
    const state = warehouseWorkflow(order, trips);
    switch (filter) {
        case 'NEW':
            return state.canPack;
        case 'READY':
            return state.canAssign;
        case 'DELIVERED':
            return state.delivered;
        default:
            return true;
    }
}
