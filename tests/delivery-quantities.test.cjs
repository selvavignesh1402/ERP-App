const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/deliveryQuantities.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject });
const { availableToDispatch } = exportsObject;
const order = { id: 1 };
const item = { product: { id: 2 }, orderedQuantity: 10, deliveredQuantity: 0 };
const note = (status, quantity, orderId = 1) => ({ status, salesOrder: { id: orderId },
    items: [{ product: { id: 2 }, deliveringQuantity: quantity }] });
test('dispatch preview subtracts active notes without counting other orders', () => {
    assert.equal(availableToDispatch(order, item, [note('ASSIGNED', 2), note('OUT_FOR_DELIVERY', 4), note('ASSIGNED', 10, 9)]), 4);
});
test('closed partial and failed notes release their undelivered quantities', () => {
    assert.equal(availableToDispatch(order, { ...item, deliveredQuantity: 3 }, [note('PARTIALLY_DELIVERED', 6), note('FAILED', 4)]), 7);
});
test('fully allocated or delivered orders never default back to their original quantity', () => {
    assert.equal(availableToDispatch(order, item, [note('ASSIGNED', 10)]), 0);
    assert.equal(availableToDispatch(order, { ...item, deliveredQuantity: 10 }, []), 0);
});
