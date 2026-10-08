import { Colors } from '../../theme/colors';

export function tripStatus(status: unknown, generatedInvoiceId?: number | null) {
    const canStart = status === 'ASSIGNED';
    const canConfirm = status === 'OUT_FOR_DELIVERY';
    const delivered = status === 'DELIVERED';
    const partial = status === 'PARTIALLY_DELIVERED';
    const failed = status === 'FAILED';
    const cancelled = status === 'CANCELLED';
    return {
        canStart,
        canConfirm,
        delivered,
        showProgress: canStart || canConfirm || delivered,
        canViewInvoice:
            (delivered || partial) &&
            Number.isSafeInteger(generatedInvoiceId) &&
            (generatedInvoiceId ?? 0) > 0,
        label: canStart
            ? 'Assigned'
            : canConfirm
              ? 'In Transit'
              : delivered
                ? 'Delivered'
                : partial
                  ? 'Partially Delivered'
                  : failed
                    ? 'Failed'
                    : cancelled
                      ? 'Cancelled'
                      : 'Unknown Status',
        color: failed ? Colors.error : delivered ? Colors.primary : Colors.text,
        background: delivered ? Colors.accent : Colors.background,
        border: Colors.border,
        explanation: partial
            ? 'This trip is closed. Any undelivered quantities remain on the order for another trip.'
            : failed
              ? 'This trip failed and cannot be restarted. Check the order before assigning another trip.'
              : cancelled
                ? 'This trip was cancelled and cannot be restarted. Check the order before assigning another trip.'
                : !canStart && !canConfirm && !delivered
                  ? 'Refresh to check the trip status. Delivery actions are unavailable.'
                  : '',
    };
}
