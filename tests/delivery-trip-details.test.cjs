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
const { tripDetails, optionalTripText } = load('src/features/delivery/tripDetails.ts');
test('trip metadata uses the backend assignment timestamp and labels its meaning', () => {
    const view = tripDetails({ assignedAt: '2026-10-08T09:15:00', dispatchDate: '2020-01-01T00:00:00' });
    assert.match(view.assignedLabel, /^Assigned:/);
    assert.match(view.assignedLabel, /2026/);
    assert.doesNotMatch(view.assignedLabel, /2020|Today/);
});
test('missing or invalid assignment timestamps do not turn into sample dates', () => {
    for (const assignedAt of [undefined, null, '', 'nonsense', '0', '2026-99-99T00:00:00'])
        assert.equal(tripDetails({ assignedAt }).assignedLabel, 'Assignment date unavailable');
});
test('notes are separate from customer address and never become a location', () => {
    const view = tripDetails({ deliveryNotes: 'Call before arriving' });
    assert.equal(view.address, 'Address unavailable');
    assert.equal(view.notes, 'Call before arriving');
    assert.equal(tripDetails({ customer: { address: ' ' }, salesOrder: { customer: { address: '12 Main Street' } } }).address, '12 Main Street');
});
test('missing record details are honestly labelled instead of using sample identities', () => {
    const view = tripDetails(null);
    assert.equal(view.number, 'Delivery number unavailable');
    assert.equal(view.vehicle, 'Vehicle not specified');
    assert.equal(view.driver, 'Driver not specified');
    assert.equal(view.customerName, 'Customer unavailable');
});
test('real record details are preserved and surrounding whitespace is removed', () => {
    const view = tripDetails({ deliveryNumber: ' DN-25 ', vehicleNumber: ' TN-01-AA-1000 ', customer: { customerName: ' Store ', address: ' Street ' }, deliveryPerson: { name: '', fullName: ' Driver ' } });
    assert.equal(view.number, 'DN-25');
    assert.equal(view.vehicle, 'TN-01-AA-1000');
    assert.equal(view.customerName, 'Store');
    assert.equal(view.address, 'Street');
    assert.equal(view.driver, 'Driver');
});
test('blank optional vehicle input remains absent in dispatch payloads', () => {
    assert.equal(optionalTripText('   '), null);
    assert.equal(optionalTripText(undefined), null);
    assert.equal(optionalTripText(' Van 02 '), 'Van 02');
});
