import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { receiptShareText, ReceiptDisplayOptions } from './receiptSharing';

const escapeHtml = (value: string) =>
    value.replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );

export function receiptPrintHtml(
    shopName: string | null,
    bill: any,
    items: any[],
    duplicate = false,
    paperSize: '58mm' | '80mm' = '80mm',
    options?: ReceiptDisplayOptions,
) {
    const text = receiptShareText(shopName, bill, items, duplicate, options);
    const width = paperSize === '58mm' ? '58mm' : '80mm';
    return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice</title><style>
        @page { size: ${width} auto; margin: 0; }
        html,body { margin:0; padding:0; background:white; color:black; }
        pre { box-sizing:border-box; width:${width}; padding:4mm; margin:0; white-space:pre-wrap;
          overflow-wrap:anywhere; font:12px/1.4 monospace; }
        </style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
}

export async function printReceipt(html: string): Promise<void> {
    if (Platform.OS !== 'web') {
        await Print.printAsync({ html });
        return;
    }
    if (typeof document === 'undefined') throw new Error('Printing requires a browser.');
    await new Promise<void>((resolve, reject) => {
        const frame = document.createElement('iframe');
        frame.title = 'Invoice print document';
        frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:80mm;height:1px;border:0';
        frame.onload = () => {
            try {
                const target = frame.contentWindow;
                if (!target) throw new Error('Could not open the print dialog.');
                target.onafterprint = () => frame.remove();
                target.focus();
                target.print();
                resolve();
                // Some browsers do not emit afterprint for iframe documents.
                setTimeout(() => frame.remove(), 120000);
            } catch (error) {
                frame.remove();
                reject(error);
            }
        };
        frame.srcdoc = html;
        document.body.appendChild(frame);
    });
}
