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
const { dispatchItems } = load('src/features/delivery/dispatch.ts');
const items = [
    { product: { id: 1, productName: 'Rice' }, availableQuantity: 10 },
    { product: { id: 2, productName: 'Flour' }, availableQuantity: 3 },
];
test('partial dispatch sends selected quantities and omits zero products', () => {
    const result = dispatchItems(items, { 1: '4', 2: '0' });
    assert.equal(result.length, 1);
    assert.equal(result[0].productId, 1);
    assert.equal(result[0].deliveringQuantity, 4);
    assert.equal('salesOrderItemId' in result[0], false);
});
test('empty and all-zero dispatches cannot create a delivery note', () => {
    assert.throws(() => dispatchItems([], {}), /greater than 0/);
    assert.throws(() => dispatchItems(items, { 1: '0', 2: '0' }), /greater than 0/);
});
test('invalid dispatch input cannot silently become a valid quantity', () => {
    for (const value of ['', '-1', '1.5', '2abc', 'NaN', 'Infinity', '11', '1e0'])
        assert.throws(() => dispatchItems(items, { 1: value, 2: '3' }), /whole dispatch quantity/);
    assert.throws(() => dispatchItems(items, { 1: '5' }));
});
test('missing or duplicate products and invalid availability require refresh', () => {
    for (const invalid of [[items[0], items[0]], [{ product: null, availableQuantity: 1 }],
        ...[null, NaN, Infinity, -1, 0.5, 2147483648].map(value => ({ product: { id: 1 }, availableQuantity: value })).map(item => [item])])
        assert.throws(() => dispatchItems(invalid, { 1: '1' }));
});
const { availableToDispatch } = load('src/services/deliveryQuantities.ts');
test('availability is rechecked against active trip allocations at submission', () => {
    const order = { id: 9 };
    const item = { product: { id: 1 }, orderedQuantity: 10, deliveredQuantity: 2 };
    const preview = notes => [{ product: item.product, availableQuantity: availableToDispatch(order, item, notes) }];
    assert.equal(dispatchItems(preview([]), { 1: '8' })[0].deliveringQuantity, 8);
    const notes = [{ salesOrder: order, status: 'ASSIGNED', items: [{ product: item.product, deliveringQuantity: 5 }] }];
    assert.throws(() => dispatchItems(preview(notes), { 1: '8' }), /0 to 3/);
    assert.equal(dispatchItems(preview(notes), { 1: '3' })[0].deliveringQuantity, 3);
});
const { DispatchItems } = load('src/features/delivery/DispatchItems.tsx', {
    'react-native': { View: 'View', Text: 'Text', TextInput: 'Input', StyleSheet: { create: value => value } },
    '../../theme/colors': load('src/theme/colors.ts'),
});
test('dispatch fields retain entered text and feed partial trip payloads', () => {
    let latest;
    function Form() {
        const [quantities, setQuantities] = React.useState({ 1: '10', 2: '3' }); latest = quantities;
        return React.createElement(DispatchItems, { items, quantities,
            onChange: (id, value) => setQuantities(previous => ({ ...previous, [id]: value })) });
    }
    let tree;
    Renderer.act(() => { tree = Renderer.create(React.createElement(Form)); });
    try {
        const input = id => tree.root.findAllByType('Input')[id];
        assert.equal(input(0).props.accessibilityLabel, 'Dispatch quantity for Rice');
        Renderer.act(() => input(0).props.onChangeText('4'));
        Renderer.act(() => input(1).props.onChangeText('0'));
        assert.equal(input(1).props.value, '0');
        assert.equal(dispatchItems(items, latest)[0].deliveringQuantity, 4);
        Renderer.act(() => input(0).props.onChangeText('1.5'));
        assert.equal(input(0).props.value, '1.5'); assert.throws(() => dispatchItems(items, latest));
    } finally { Renderer.act(() => tree.unmount()); }
});
