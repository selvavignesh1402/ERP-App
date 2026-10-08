const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/purchaseQuantities.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject });
const { purchaseReceiptRows } = exportsObject;
const line = (quantity, price = 100, id = 2) => ({ product: { id, productName: 'Rice' }, quantity, price });
test('duplicate product lines share one remaining quantity and input', () => {
    const rows = purchaseReceiptRows([line(4), line(6)], { 2: 6 });
    assert.equal(rows.length, 1); assert.equal(rows[0].orderedQty, 10);
    assert.equal(rows[0].remaining, 4); assert.equal(rows[0].receivedQty, '4');
});
test('different products retain separate quantities and completed lines stay zero', () => {
    const rows = purchaseReceiptRows([line(4), line(6, 100, 3)], { 2: 4 });
    assert.equal(rows.length, 2); assert.equal(rows[0].remaining, 0); assert.equal(rows[1].remaining, 6);
});
test('fractional quantities have clean defaults after earlier receipts', () => {
    const rows = purchaseReceiptRows([line(0.1), line(0.2)], { 2: 0.1 });
    assert.equal(rows[0].orderedQty, 0.3); assert.equal(rows[0].receivedQty, '0.2');
});
test('different purchase prices retain their combined value in receipt defaults', () => {
    const row = purchaseReceiptRows([line(4, 100), line(6, 200)], {})[0];
    assert.equal(row.unitPrice * row.orderedQty, 1600);
});
