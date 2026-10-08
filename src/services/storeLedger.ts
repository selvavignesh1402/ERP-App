export interface StoreLedgerInvoice {
    id: number | string;
    billNumber?: string;
    saleDate: string;
    grandTotal: number;
    paidAmount?: number;
    balanceDue?: number;
    paymentMode?: string;
    status?: string;
    items?: any[];
    customer?: { id: number; customerName?: string; [key: string]: any };
    customerId?: number;
    [key: string]: any;
}

export interface StoreLedgerReceipt {
    id: number | string;
    referenceType: string;
    referenceId: number | string;
    amount: number;
    paymentMode: string;
    paymentDate: string;
    saleAllocations?: Record<string, number>;
    [key: string]: any;
}

export interface StoreLedgerTransaction {
    id: string;
    type: 'INVOICE' | 'PAYMENT';
    date: string;
    amount: number;
    title: string;
    subtitle: string;
    badgeText: string;
    badgeColor: string;
    badgeBg: string;
    status?: string;
    raw: any;
}

export interface StoreLedgerResult {
    invoices: StoreLedgerInvoice[];
    receipts: StoreLedgerReceipt[];
    invoiced: number;
    received: number;
    transactions: StoreLedgerTransaction[];
}

/**
 * Determine payment status for a sales invoice
 */
export function getInvoiceStatus(invoice: StoreLedgerInvoice): {
    status: 'PAID' | 'PARTIAL' | 'UNPAID';
    label: string;
    color: string;
    bg: string;
    border: string;
} {
    const total = Number(invoice.grandTotal || 0);
    const paid = Number(invoice.paidAmount ?? 0);
    const balance = Number(invoice.balanceDue ?? total - paid);

    if (total > 0 && balance <= 0) {
        return { status: 'PAID', label: 'Fully Paid', color: '#2E7D32', bg: '#E8F5E9', border: '#C8E6C9' };
    }
    if (paid > 0 && balance > 0) {
        return {
            status: 'PARTIAL',
            label: 'Partial Due',
            color: '#E65100',
            bg: '#FFF3E0',
            border: '#FFE0B2',
        };
    }
    return { status: 'UNPAID', label: 'Unpaid', color: '#C62828', bg: '#FFEBEE', border: '#FFCDD2' };
}

// A customer collection may be allocated to several invoices: list its receipt
// once, rather than combining each invoice's payment history.
export function storeLedgerRecords(customerId: number, sales: any[], payments: any[]): StoreLedgerResult {
    const safeSales = Array.isArray(sales) ? sales : [];
    const safePayments = Array.isArray(payments) ? payments : [];

    const invoices: StoreLedgerInvoice[] = safeSales.filter(
        (s) => Number(s.customer?.id ?? s.customerId) === customerId,
    );
    const invoiceIds = new Set(invoices.map((s) => Number(s.id)));

    const receipts: StoreLedgerReceipt[] = safePayments.filter(
        (p) =>
            (p.referenceType === 'CUSTOMER' && Number(p.referenceId) === customerId) ||
            (p.referenceType === 'SALE' && invoiceIds.has(Number(p.referenceId))),
    );

    const newest = (field: string) => (a: any, b: any) =>
        (Date.parse(b[field]) || 0) - (Date.parse(a[field]) || 0) || Number(b.id) - Number(a.id);

    invoices.sort(newest('saleDate'));
    receipts.sort(newest('paymentDate'));

    const total = (rows: any[], key: string) =>
        rows.reduce((sum, row) => sum + Math.round(Number(row[key] || 0) * 100), 0) / 100;

    // Create a chronological merged transaction list
    const invoiceTxns: StoreLedgerTransaction[] = invoices.map((inv) => {
        const invStatus = getInvoiceStatus(inv);
        const billTitle = inv.billNumber
            ? inv.billNumber.startsWith('#') ||
              inv.billNumber.startsWith('BILL') ||
              inv.billNumber.startsWith('INV')
                ? inv.billNumber
                : `Bill #${inv.billNumber}`
            : `Invoice #${inv.id}`;

        return {
            id: `inv-${inv.id}`,
            type: 'INVOICE' as const,
            date: inv.saleDate || '',
            amount: Number(inv.grandTotal || 0),
            title: billTitle,
            subtitle: inv.paymentMode ? `Payment: ${inv.paymentMode}` : 'Sales Order',
            badgeText: invStatus.label,
            badgeColor: invStatus.color,
            badgeBg: invStatus.bg,
            status: invStatus.status,
            raw: inv,
        };
    });

    const paymentTxns: StoreLedgerTransaction[] = receipts.map((pmt) => {
        const isCustomerCollection = pmt.referenceType === 'CUSTOMER';
        const linkedInvoice = !isCustomerCollection
            ? invoices.find((s) => Number(s.id) === Number(pmt.referenceId))
            : null;

        return {
            id: `pmt-${pmt.id}`,
            type: 'PAYMENT' as const,
            date: pmt.paymentDate || '',
            amount: Number(pmt.amount || 0),
            title: `Payment #${pmt.id}`,
            subtitle: isCustomerCollection
                ? 'Store collection (Direct settlement)'
                : linkedInvoice?.billNumber
                  ? `Linked to ${linkedInvoice.billNumber}`
                  : `Linked to Invoice #${pmt.referenceId}`,
            badgeText: pmt.paymentMode || 'Payment',
            badgeColor: '#1565C0',
            badgeBg: '#E3F2FD',
            raw: pmt,
        };
    });

    const transactions = [...invoiceTxns, ...paymentTxns].sort(
        (a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0),
    );

    return {
        invoices,
        receipts,
        invoiced: total(invoices, 'grandTotal'),
        received: total(receipts, 'amount'),
        transactions,
    };
}
