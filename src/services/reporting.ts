export interface SalesSummary {
    invoiceCount: number;
    invoicedTotal: number;
    paymentsApplied: number;
    outstanding: number;
    asOf: string;
    periodStart: string;
    periodEnd: string;
    trend: { date: string; amount: number }[];
}

export const reportMoney = (amount: number | null | undefined) =>
    amount == null
        ? '—'
        : `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function salesTrendBars(summary: SalesSummary | null) {
    if (!summary || !Array.isArray(summary.trend)) return [];
    const highest = Math.max(0, ...summary.trend.map((day) => Number(day.amount)));
    const peakIndex = summary.trend.findIndex((day) => Number(day.amount) === highest);
    return summary.trend.map((day, index) => ({
        date: day.date,
        day: day.date ? day.date.slice(5) : '',
        value: Number(day.amount),
        amount: highest > 0 ? (Number(day.amount) / highest) * 100 : 0,
        peak: highest > 0 && index === peakIndex,
        label: reportMoney(Number(day.amount)),
    }));
}

export function paymentPresentation(payment: { referenceType?: string | null; referenceId?: number | null }) {
    const id = payment.referenceId ?? 'Unavailable';
    switch (payment.referenceType) {
        case 'SALE':
            return { direction: 'incoming', label: `Sale invoice #${id}`, status: 'Received', sign: '+' };
        case 'CUSTOMER':
            return {
                direction: 'incoming',
                label: `Customer collection #${id}`,
                status: 'Received',
                sign: '+',
            };
        case 'PURCHASE':
            return { direction: 'outgoing', label: `Purchase invoice #${id}`, status: 'Paid out', sign: '-' };
        case 'SUPPLIER':
            return { direction: 'outgoing', label: `Supplier payment #${id}`, status: 'Paid out', sign: '-' };
        default:
            return {
                direction: 'unknown',
                label: `Unclassified payment #${id}`,
                status: 'Direction unknown',
                sign: '',
            };
    }
}
