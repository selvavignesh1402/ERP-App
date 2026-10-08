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
const { confirmationItems } = load('src/features/delivery/confirmation.ts');
const items = [
    { product: { id: 1, productName: 'Rice' }, deliveringQuantity: 5 },
    { product: { id: 2, productName: 'Flour' }, deliveringQuantity: 3 },
];
test('partial delivery sends actual quantities and retains explicit zero items', () => {
    const result = confirmationItems(items, { 1: '2', 2: '0' });
    assert.equal(result[0].deliveredQuantity, 2); assert.equal(result[1].deliveredQuantity, 0);
    assert.equal(result[0].productId, 1); assert.equal(result[1].productId, 2);
});
test('all-zero and full deliveries are both explicit valid confirmations', () => {
    assert.equal(confirmationItems(items, { 1: '0', 2: '0' }).every(item => item.deliveredQuantity === 0), true);
    assert.equal(confirmationItems(items, { 1: '5', 2: '3' })[1].deliveredQuantity, 3);
});
test('blank, negative, fractional, malformed and excess quantities cannot become a payload', () => {
    for (const value of ['', '-1', '1.5', '2abc', 'NaN', 'Infinity', '6', '1e0'])
        assert.throws(() => confirmationItems(items, { 1: value, 2: '3' }), /whole received quantity/);
    assert.throws(() => confirmationItems(items, { 1: '5' }));
});
test('missing and duplicate products or invalid dispatch counts require refresh', () => {
    for (const invalid of [[], [items[0], items[0]], [{ product: null, deliveringQuantity: 1 }],
        [{ product: { id: 1 }, deliveringQuantity: null }], [{ product: { id: 1 }, deliveringQuantity: -1 }]])
        assert.throws(() => confirmationItems(invalid, { 1: '1' }));
});
test('zero dispatch cannot fall back to an original ordered quantity', () => {
    const item = { product: { id: 1 }, deliveringQuantity: 0, orderedQuantity: 10 };
    assert.equal(confirmationItems([item], { 1: '0' })[0].deliveredQuantity, 0);
    assert.throws(() => confirmationItems([item], { 1: '10' }));
});
const { ReceivedItems } = load('src/features/delivery/ReceivedItems.tsx', {
    'react-native': { View: 'View', Text: 'Text', TextInput: 'Input', StyleSheet: { create: value => value } },
    '../../theme/colors': load('src/theme/colors.ts'),
});
test('received-quantity fields retain typed values and feed actual confirmation', () => {
    let latest;
    function Form() {
        const [quantities, setQuantities] = React.useState({ 1: '5', 2: '3' }); latest = quantities;
        return React.createElement(ReceivedItems, { items, quantities,
            onChange: (id, value) => setQuantities(previous => ({ ...previous, [id]: value })) });
    }
    let tree;
    Renderer.act(() => { tree = Renderer.create(React.createElement(Form)); });
    try {
        const input = id => tree.root.findAllByType('Input')[id];
        Renderer.act(() => input(0).props.onChangeText('2'));
        Renderer.act(() => input(1).props.onChangeText('0'));
        assert.equal(input(1).props.value, '0');
        assert.equal(confirmationItems(items, latest)[0].deliveredQuantity, 2);
        Renderer.act(() => input(0).props.onChangeText('1.5'));
        assert.equal(input(0).props.value, '1.5'); assert.throws(() => confirmationItems(items, latest));
    } finally { Renderer.act(() => tree.unmount()); }
});
