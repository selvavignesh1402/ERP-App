const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}, globals = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name), atob, ...globals });
    return exports;
}
const token = exp => 'header.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.signature';
function session(os) {
    const data = new Map();
    const localStorage = { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
    return load('src/services/offlineSession.ts', { 'react-native': { Platform: { OS: os } },
        'expo-secure-store': { getItemAsync: async k => data.get(k), setItemAsync: async (k,v) => data.set(k,v), deleteItemAsync: async k => data.delete(k) } },
        { window: { localStorage } });
}
for (const os of ['web', 'android']) {
    test(`${os}: offline startup restores only the exact unexpired verified session`, async () => {
        const s = session(os); const current = token(Date.now()/1000 + 300);
        await s.saveOfflineSession(current, { id: 1, organizationId: 2, permissions: ['sale:create'] });
        assert.equal((await s.restoreOfflineSession(current)).organizationId, 2);
        assert.equal(await s.restoreOfflineSession(token(Date.now()/1000 + 600)), null);
        const expired = token(Date.now()/1000 - 1);
        await s.saveOfflineSession(expired, { id: 1, organizationId: 2 });
        assert.equal(await s.restoreOfflineSession(expired), null);
        assert.equal(await s.restoreOfflineSession('malformed'), null);
    });
    test(`${os}: queued logout removes a pending profile save`, async () => {
        const s = session(os); const current = token(Date.now()/1000 + 300);
        const saving = s.saveOfflineSession(current, { id: 1, organizationId: 2 });
        const clearing = s.clearOfflineSession(); await Promise.all([saving, clearing]);
        assert.equal(await s.restoreOfflineSession(current), null);
    });
}
const sharing = load('src/services/receiptSharing.ts');
const bill = { id: 5, billNumber: 'INV-5', grandTotal: 40, paidAmount: 10, balanceDue: 30 };
const items = [{ productName: '<script>alert(1)</script>', quantity: 2, price: 20 }];
test('80mm print document uses real invoice totals and escapes all user HTML', () => {
    const printing = load('src/services/receiptPrinting.ts', { 'react-native': { Platform: { OS: 'android' } }, 'expo-print': {}, './receiptSharing': sharing });
    const html = printing.receiptPrintHtml('A & B', bill, items);
    assert.match(html, /width:80mm/); assert.match(html, /Invoice: INV-5/); assert.match(html, /Balance due: ₹30.00/);
    assert.match(html, /A &amp; B/); assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
});
test('native printing calls the real print API and propagates printer errors', async () => {
    const calls = [];
    const printing = load('src/services/receiptPrinting.ts', { 'react-native': { Platform: { OS: 'android' } },
        'expo-print': { printAsync: async value => { calls.push(value.html); throw new Error('Printer unavailable'); } }, './receiptSharing': sharing });
    await assert.rejects(printing.printReceipt('invoice'), /Printer unavailable/); assert.deepEqual(calls, ['invoice']);
});
test('browser printing opens the invoice frame and cleans up after printing', async () => {
    let printed = 0, removed = 0;
    const frame = { style: {}, remove: () => removed++, contentWindow: { focus() {}, print: () => printed++ } };
    const printing = load('src/services/receiptPrinting.ts', { 'react-native': { Platform: { OS: 'web' } }, 'expo-print': {}, './receiptSharing': sharing },
        { document: { createElement: () => frame, body: { appendChild: () => frame.onload() } }, setTimeout() {} });
    await printing.printReceipt('invoice html'); assert.equal(frame.srcdoc, 'invoice html'); assert.equal(printed, 1);
    frame.contentWindow.onafterprint(); assert.equal(removed, 1);
});
