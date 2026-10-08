const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}) {
    const exports = {};
    const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.React },
    }).outputText;
    vm.runInNewContext(compiled, { exports, require: name => mocks[name] || require(name) });
    return exports;
}
const { receiptShopName, receiptForSharing, receiptShareText } = load('src/services/receiptSharing.ts');
const bill = { id: 2, billNumber: 'INV-2', grandTotal: 10.5, paymentMode: 'CREDIT', paidAmount: 4, balanceDue: 6.5 };
const items = [{ product: { productName: 'Rice' }, quantity: 2, price: 5.25 }];
test('receipt identity only accepts the selected organization and a nonempty saved name', () => {
    assert.equal(receiptShopName({ organizationId: 2, name: ' Shop B ' }, 2), 'Shop B');
    assert.equal(receiptShopName({ organizationId: 1, name: 'Shop A' }, 2), null);
    assert.equal(receiptShopName({ organizationId: 2, name: ' ' }, 2), null);
    assert.equal(receiptShopName(null, 2), null);
});
test('shared receipt uses actual shop, selected invoice and authoritative balances', () => {
    const text = receiptShareText('Shop B', bill, items, true);
    assert.match(text, /^Shop B\nInvoice: INV-2 \(DUPLICATE\)/);
    assert.match(text, /Rice x 2 = ₹10.50/); assert.match(text, /Paid: ₹4.00 \| Balance due: ₹6.50/);
    assert.doesNotMatch(text, /LAKSHMI|Salem|33AAAA|@upi/);
});
test('missing identity or items prevents sharing a misleading receipt', () => {
    assert.throws(() => receiptShareText(null, bill, items, false), /Shop details/);
    assert.throws(() => receiptShareText('Shop', bill, [], false), /Invoice items/);
});
test('card sharing loads the explicitly tapped invoice rather than previously opened state', async () => {
    const requested = [];
    const api = { get: async url => { requested.push(url); return { data: url.endsWith('/items') ? items : bill }; } };
    const result = await receiptForSharing(api, { id: 2 });
    assert.deepEqual(requested.sort(), ['/sales/2', '/sales/2/items']);
    assert.equal(result.bill.billNumber, 'INV-2'); assert.equal(result.items, items);
});
test('failed invoice load rejects sharing instead of using old items', async () => {
    await assert.rejects(receiptForSharing({ get: async () => { throw new Error('offline'); } }, { id: 2 }), /offline/);
});
test('offline invoice uses its own items and is clearly pending synchronization', async () => {
    const sale = { ...bill, isOffline: true, items };
    const result = await receiptForSharing({ get: () => { throw new Error('Should not fetch'); } }, sale);
    assert.equal(result.bill, sale); assert.equal(result.items, items);
    assert.match(receiptShareText('Shop B', result.bill, result.items, false), /Pending synchronization/);
});

// Render the actual receipt/settings with lightweight native primitives; no hardware or browser required.
const primitive = tag => ({ children, disabled }) => React.createElement(tag, { disabled }, children);
const native = { View: primitive('div'), Text: primitive('span'), Modal: primitive('section'), ScrollView: primitive('div'),
    TouchableOpacity: primitive('button'), Switch: ({ value }) => React.createElement('input', { type: 'checkbox', checked: value, readOnly: true }),
    StyleSheet: { create: styles => styles }, Platform: { select: values => values.default } };
const svg = { __esModule: true, default: primitive('svg'), Path: primitive('path') };
const ThermalReceipt = load('src/components/ThermalReceipt.tsx', { 'react-native': native, 'react-native-svg': svg }).default;
const PrintSettingsModal = load('src/components/PrintSettingsModal.tsx', { 'react-native': native }).default;

test('interstate receipt shows IGST and no fixed 2.5 percent label; exempt receipt has no tax row', () => {
    const interstate = renderToStaticMarkup(React.createElement(ThermalReceipt, {
        bill: { ...bill, cgst: 0, sgst: 0, igst: 18, grandTotal: 118 }, items, shopDetails: { name: 'Shop' },
    }));
    assert.match(interstate, /IGST/); assert.match(interstate, /18\.00/);
    assert.doesNotMatch(interstate, /CGST|SGST|2\.5%/);
    const exempt = renderToStaticMarkup(React.createElement(ThermalReceipt, {
        bill: { ...bill, cgst: 0, sgst: 0, igst: 0 }, items, shopDetails: { name: 'Shop' },
    }));
    assert.doesNotMatch(exempt, /CGST|SGST|IGST/);
});
test('receipt preview contains no invented shop contacts or payment QR', () => {
    const html = renderToStaticMarkup(React.createElement(ThermalReceipt, { bill, items, shopDetails: { name: 'Shop B' } }));
    assert.match(html, /Shop B/); assert.doesNotMatch(html, /LAKSHMI|Salem|98765|33AAAA|@upi|SCAN TO PAY|Phone:/);
});
test('missing receipt identity is explicitly unavailable rather than sample business data', () => {
    const html = renderToStaticMarkup(React.createElement(ThermalReceipt, { bill, items }));
    assert.match(html, /Shop details unavailable/); assert.doesNotMatch(html, /LAKSHMI|@upi/);
});
test('settings are preview-only and contain no fabricated printer discovery or print action', () => {
    const html = renderToStaticMarkup(React.createElement(PrintSettingsModal, { visible: true, onClose() {}, onSaveSettings() {},
        settings: { paperSize: '58mm', fontSize: 'normal', options: { showLogo: true, showGst: true, showCustomer: true, showPayment: true, showThanks: true } } }));
    assert.match(html, /Printing uses the system print dialog/); assert.match(html, /payment QR is not configured/); assert.match(html, /Apply preview settings/);
    assert.doesNotMatch(html, /PT-210|Epson|Scan Nearby|Ready|Print Now|Print Receipt|Bluetooth/);
});
