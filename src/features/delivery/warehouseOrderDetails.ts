interface WarehouseItem {
    product?: { productName?: string | null; unit?: string | null; weightPerUnit?: number | null } | null;
    orderedQuantity?: number | null;
}

interface WarehouseOrderDetailsInput {
    orderNumber?: string | null;
    orderDate?: string | null;
    customer?: { customerName?: string | null } | null;
    salesperson?: { name?: string | null; fullName?: string | null } | null;
    items?: WarehouseItem[] | null;
}

function text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function wholeQuantity(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function warehouseOrderDetails(order: WarehouseOrderDetailsInput) {
    const first = order.items?.[0];
    const dateValue = text(order.orderDate);
    const date = dateValue ? new Date(dateValue) : null;
    const product = text(first?.product?.productName);
    const unit = text(first?.product?.unit);
    const weight = first?.product?.weightPerUnit;
    const quantity = wholeQuantity(first?.orderedQuantity);
    const itemLabel = quantity == null ? 'Quantity unavailable' : `${quantity} ${unit || 'units'}`;
    const weightLabel =
        typeof weight === 'number' && Number.isFinite(weight) && weight >= 0 && quantity != null
            ? ` • ${(quantity * weight).toLocaleString('en-IN')} ${unit === 'kg' ? 'kg' : 'weight units'}`
            : '';
    return {
        orderNumber: text(order.orderNumber) ?? 'Order number unavailable',
        customer: text(order.customer?.customerName) ?? 'Customer unavailable',
        salesperson:
            text(order.salesperson?.name) ?? text(order.salesperson?.fullName) ?? 'Salesperson unavailable',
        dateLabel:
            date && Number.isFinite(date.getTime())
                ? date.toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                  })
                : 'Order date unavailable',
        itemLabel: `${itemLabel}${product ? ` • ${product}` : ''}${weightLabel}`,
    };
}
