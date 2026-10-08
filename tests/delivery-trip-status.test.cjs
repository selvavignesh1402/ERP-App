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
const { tripStatus } = load('src/features/delivery/tripStatus.ts', {
    '../../theme/colors': load('src/theme/colors.ts'),
});
test('only assigned trips can start and only in-transit trips can confirm', () => {
    for (const status of ['ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'CANCELLED']) {
        const view = tripStatus(status);
        assert.equal(view.canStart, status === 'ASSIGNED');
        assert.equal(view.canConfirm, status === 'OUT_FOR_DELIVERY');
    }
});
test('partial deliveries have a closed-trip explanation rather than an assigned progress display', () => {
    const view = tripStatus('PARTIALLY_DELIVERED', 42);
    assert.equal(view.label, 'Partially Delivered');
    assert.equal(view.showProgress, false);
    assert.match(view.explanation, /trip is closed/);
    assert.equal(view.canViewInvoice, true);
});
test('failed trips do not offer restart, confirmation or invoices', () => {
    const view = tripStatus('FAILED', 42);
    assert.equal(view.label, 'Failed');
    assert.equal(view.showProgress, false);
    assert.equal(view.canStart, false);
    assert.equal(view.canConfirm, false);
    assert.equal(view.canViewInvoice, false);
    assert.match(view.explanation, /cannot be restarted/);
});
test('invoice links require an actual generated invoice, including partial deliveries with nothing received', () => {
    for (const status of ['DELIVERED', 'PARTIALLY_DELIVERED']) {
        for (const id of [undefined, null, 0, -1, NaN, 0.5, '42'])
            assert.equal(tripStatus(status, id).canViewInvoice, false);
        assert.equal(tripStatus(status, 42).canViewInvoice, true);
    }
    assert.equal(tripStatus('ASSIGNED', 42).canViewInvoice, false);
    assert.equal(tripStatus('OUT_FOR_DELIVERY', 42).canViewInvoice, false);
});
test('missing and future status values fail closed without claiming assignment', () => {
    for (const status of [null, undefined, '', 'FUTURE_STATUS', 'constructor', {}]) {
        const view = tripStatus(status, 42);
        assert.equal(view.label, 'Unknown Status');
        assert.equal(view.canStart, false);
        assert.equal(view.canConfirm, false);
        assert.equal(view.canViewInvoice, false);
        assert.equal(view.showProgress, false);
        assert.match(view.explanation, /Refresh/);
    }
});
test('normal trip progress retains distinct assigned, transit and completed labels', () => {
    for (const [status, label] of [['ASSIGNED', 'Assigned'], ['OUT_FOR_DELIVERY', 'In Transit'], ['DELIVERED', 'Delivered']]) {
        const view = tripStatus(status);
        assert.equal(view.label, label);
        assert.equal(view.showProgress, true);
        assert.equal(view.delivered, status === 'DELIVERED');
    }
});

test('cancelled trips have their own label and no delivery actions', () => {
    const view = tripStatus('CANCELLED', 42);
    assert.equal(view.label, 'Cancelled');
    assert.equal(view.canStart, false);
    assert.equal(view.canConfirm, false);
    assert.equal(view.canViewInvoice, false);
    assert.equal(view.showProgress, false);
    assert.match(view.explanation, /cancelled and cannot be restarted/);
});
