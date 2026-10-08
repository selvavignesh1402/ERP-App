import { tripDetails, optionalTripText } from './tripDetails';
import { tripStatus } from './tripStatus';

export type ShareableDelivery = NonNullable<Parameters<typeof tripDetails>[0]> & {
    status?: string;
    items?: {
        product?: { productName?: string | null } | null;
        deliveringQuantity?: number | null;
        deliveredQuantity?: number | null;
    }[];
};

export function deliverySummary(delivery: ShareableDelivery): string {
    if (!optionalTripText(delivery.deliveryNumber))
        throw new Error('Delivery number is unavailable. Refresh this delivery before sharing.');
    const details = tripDetails(delivery);
    const received = delivery.status === 'DELIVERED' || delivery.status === 'PARTIALLY_DELIVERED';
    const quantity = (value: number | null | undefined) =>
        typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
            ? `${value} bags`
            : 'Unavailable';
    const lines = (delivery.items ?? []).map(
        (item) =>
            `${optionalTripText(item.product?.productName) ?? 'Product unavailable'}: dispatched ${quantity(item.deliveringQuantity)}${received ? `; received ${quantity(item.deliveredQuantity)}` : ''}`,
    );
    return [
        `Delivery: ${details.number}`,
        `Status: ${tripStatus(delivery.status).label}`,
        details.assignedLabel,
        `Customer: ${details.customerName}`,
        `Address: ${details.address}`,
        `Vehicle: ${details.vehicle}`,
        ...lines,
        lines.length === 0 ? 'Delivery items unavailable.' : '',
        'Delivery summary only. See the invoice for billing details.',
    ]
        .filter(Boolean)
        .join('\n');
}
