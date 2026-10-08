interface ContactDetails {
    customerName?: string | null;
    address?: string | null;
}

interface TripDetails {
    assignedAt?: string | null;
    deliveryNumber?: string | null;
    vehicleNumber?: string | null;
    deliveryNotes?: string | null;
    customer?: ContactDetails | null;
    salesOrder?: { customer?: ContactDetails | null } | null;
    deliveryPerson?: { name?: string | null; fullName?: string | null } | null;
}

export function optionalTripText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function tripDetails(delivery?: TripDetails | null) {
    const customer = delivery?.customer;
    const orderCustomer = delivery?.salesOrder?.customer;
    const assigned = optionalTripText(delivery?.assignedAt);
    const date = assigned && /^\d{4}-\d{2}-\d{2}T/.test(assigned) ? new Date(assigned) : null;
    const assignedLabel =
        date && Number.isFinite(date.getTime())
            ? `Assigned: ${date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            : 'Assignment date unavailable';
    return {
        assignedLabel,
        number: optionalTripText(delivery?.deliveryNumber) ?? 'Delivery number unavailable',
        customerName:
            optionalTripText(customer?.customerName) ??
            optionalTripText(orderCustomer?.customerName) ??
            'Customer unavailable',
        address:
            optionalTripText(customer?.address) ??
            optionalTripText(orderCustomer?.address) ??
            'Address unavailable',
        vehicle: optionalTripText(delivery?.vehicleNumber) ?? 'Vehicle not specified',
        driver:
            optionalTripText(delivery?.deliveryPerson?.name) ??
            optionalTripText(delivery?.deliveryPerson?.fullName) ??
            'Driver not specified',
        notes: optionalTripText(delivery?.deliveryNotes),
    };
}
