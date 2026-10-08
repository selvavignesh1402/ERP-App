const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const Renderer = require('react-test-renderer');
function load(file, mocks = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name) });
    return exports;
}
const { warehouseOrderDetails } = load('src/features/delivery/warehouseOrderDetails.ts');
test('warehouse cards use saved order date, customer, product and quantity', () => {
    const details = warehouseOrderDetails({ orderNumber: 'SO-5', orderDate: '2026-10-08T09:15:00', customer: { customerName: 'Shop' }, salesperson: { name: 'Asha' }, items: [{ product: { productName: 'Basmati', unit: 'bags', weightPerUnit: 25 }, orderedQuantity: 4 }] });
    assert.equal(details.orderNumber, 'SO-5');
    assert.equal(details.customer, 'Shop');
    assert.equal(details.salesperson, 'Asha');
    assert.match(details.dateLabel, /2026/);
    assert.equal(details.itemLabel, '4 bags • Basmati • 100 weight units');
});
test('warehouse cards do not invent date, identity, product or quantity values', () => {
    const details = warehouseOrderDetails({ orderDate: 'invalid', salesperson: {}, items: [{ product: {}, orderedQuantity: null }] });
    assert.equal(details.dateLabel, 'Order date unavailable');
    assert.equal(details.customer, 'Customer unavailable');
    assert.equal(details.salesperson, 'Salesperson unavailable');
    assert.equal(details.itemLabel, 'Quantity unavailable');
});
test('weight conversion is only shown when the product explicitly provides a nonnegative weight', () => {
    assert.doesNotMatch(warehouseOrderDetails({ items: [{ product: { productName: 'Rice' }, orderedQuantity: 5 }] }).itemLabel, /kg|weight/);
    assert.doesNotMatch(warehouseOrderDetails({ items: [{ product: { productName: 'Rice', weightPerUnit: -1 }, orderedQuantity: 5 }] }).itemLabel, /weight/);
    assert.match(warehouseOrderDetails({ items: [{ product: { productName: 'Rice', unit: 'kg', weightPerUnit: 2.5 }, orderedQuantity: 4 }] }).itemLabel, /10 kg/);
});
test('salesperson fullName is used only when name is absent', () => {
    assert.equal(warehouseOrderDetails({ salesperson: { name: ' A ', fullName: 'B' } }).salesperson, 'A');
    assert.equal(warehouseOrderDetails({ salesperson: { fullName: ' B ' } }).salesperson, 'B');
});
