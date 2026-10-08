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
const { warehouseWorkflow, matchesWarehouseFilter } = load('src/features/delivery/warehouseWorkflow.ts');
test('packing is offered only for statuses allowed by the backend transition rules', () => {
    for (const status of ['DRAFT', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED', 'FUTURE']) {
        const view = warehouseWorkflow({ id: 1, status });
        assert.equal(view.canPack, ['CONFIRMED', 'PROCESSING', 'PARTIALLY_DELIVERED'].includes(status));
        assert.equal(view.canAssign, status === 'READY_FOR_DELIVERY');
    }
});
test('empty or zero-remaining items never turn an undelivered order into delivered', () => {
    for (const items of [[], [{ remainingQuantity: 0 }], undefined]) {
        const order = { id: 1, status: 'CONFIRMED', items };
        assert.equal(warehouseWorkflow(order).delivered, false);
        assert.equal(matchesWarehouseFilter(order, 'DELIVERED'), false);
    }
    assert.equal(matchesWarehouseFilter({ status: 'DELIVERED', items: [] }, 'DELIVERED'), true);
});
test('active trips block packing, while other orders and closed trips do not', () => {
    const order = { id: 1, status: 'PARTIALLY_DELIVERED' };
    for (const status of ['ASSIGNED', 'OUT_FOR_DELIVERY']) {
        const trips = [{ salesOrder: { id: 1 }, status }];
        assert.equal(warehouseWorkflow(order, trips).canPack, false);
        assert.equal(matchesWarehouseFilter(order, 'NEW', trips), false);
        assert.match(warehouseWorkflow(order, trips).explanation, /active delivery/);
        assert.equal(warehouseWorkflow(order, [{ salesOrder: { id: 2 }, status }]).canPack, true);
    }
    for (const status of ['DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'CANCELLED'])
        assert.equal(warehouseWorkflow(order, [{ salesOrder: { id: 1 }, status }]).canPack, true);
});
test('all and delivered filters include completed orders consistently and exclude cancellations', () => {
    const orders = ['CONFIRMED', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status, id) => ({ id, status }));
    assert.equal(orders.filter(order => matchesWarehouseFilter(order, 'ALL')).length, 4);
    assert.equal(orders.filter(order => matchesWarehouseFilter(order, 'DELIVERED')).length, 1);
    assert.equal(orders.filter(order => matchesWarehouseFilter(order, 'NEW')).length, 1);
    assert.equal(orders.filter(order => matchesWarehouseFilter(order, 'READY')).length, 1);
});
test('in-transit, partial, draft and unknown orders are never labelled To Pack', () => {
    for (const [status, label] of [['OUT_FOR_DELIVERY', 'Out for Delivery'], ['PARTIALLY_DELIVERED', 'Partially Delivered'], ['DRAFT', 'Draft'], ['constructor', 'Unknown Status']])
        assert.equal(warehouseWorkflow({ status }).label, label);
    assert.match(warehouseWorkflow({ status: 'DRAFT' }).explanation, /Confirm this order/);
});
test('ready orders with active partial allocations can still use the dispatch quantity checks', () => {
    const view = warehouseWorkflow({ id: 1, status: 'READY_FOR_DELIVERY' }, [{ salesOrder: { id: 1 }, status: 'ASSIGNED' }]);
    assert.equal(view.canAssign, true);
    assert.equal(view.canPack, false);
});
