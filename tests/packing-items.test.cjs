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
const { PackingItems } = load('src/features/delivery/PackingItems.tsx', {
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
    '../../theme/colors': load('src/theme/colors.ts'),
});
function render(items, verify) {
    let tree;
    Renderer.act(() => { tree = Renderer.create(React.createElement(PackingItems, { items })); });
    try {
        const texts = tree.root.findAllByType('Text').map(node => React.Children.toArray(node.props.children).join(''));
        verify(texts, tree);
    } finally { Renderer.act(() => tree.unmount()); }
}
test('packing summary shows remaining quantities without offering unsaved edits', () => {
    render([{ id: 1, orderedQuantity: 10, remainingQuantity: 4, product: { productName: 'Rice', stock: 12 } }], (texts, tree) => {
        assert.ok(texts.includes('Remaining: 4 bags')); assert.ok(texts.includes('Ordered: 10 bags'));
        assert.ok(texts.some(text => text.includes('partial dispatch quantities in the next step')));
        assert.equal(tree.root.findAll(node => typeof node.props.onChangeText === 'function' || typeof node.props.onPress === 'function').length, 0);
    });
});
test('fully delivered lines display zero rather than the original order amount', () => {
    render([{ id: 1, orderedQuantity: 10, deliveredQuantity: 10, remainingQuantity: 0 }], texts => {
        assert.ok(texts.includes('Remaining: 0 bags'));
    });
});
test('older order records derive remaining quantity from deliveries', () => {
    render([{ id: 1, orderedQuantity: 10, deliveredQuantity: 3 }], texts => {
        assert.ok(texts.includes('Remaining: 7 bags')); assert.ok(texts.includes('Physical stock: Unavailable'));
    });
});
test('physical stock keeps fractional values and actual zero', () => {
    render([{ id: 1, orderedQuantity: 1, product: { stock: 1.5 } }, { id: 2, orderedQuantity: 1, product: { stock: 0 } }], texts => {
        assert.ok(texts.includes('Physical stock: 1.5')); assert.ok(texts.includes('Physical stock: 0'));
    });
});
