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
const { DeliveryItems } = load('src/features/delivery/DeliveryItems.tsx', {
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
    '../../theme/colors': load('src/theme/colors.ts'),
});
function render(items, status = 'ASSIGNED') {
    let tree;
    Renderer.act(() => { tree = Renderer.create(React.createElement(DeliveryItems, { items, status })); });
    try { return tree.root.findAllByType('Text').map(node => node.children.join('')).join('\n'); }
    finally { Renderer.act(() => tree.unmount()); }
}
const item = { product: { productName: 'Rice' }, deliveringQuantity: 10, deliveredQuantity: 4, unitPrice: 125.25 };
test('delivery details use saved quantities and explicitly label unit prices', () => {
    const text = render([item]);
    assert.match(text, /Rice/);
    assert.match(text, /Dispatched: 10 bags/);
    assert.match(text, /Unit price: \u20b9125.25/);
    assert.doesNotMatch(text, /Received:|kg|Sunflower|1,252/);
});
test('partial and complete deliveries show dispatched and received separately', () => {
    for (const status of ['PARTIALLY_DELIVERED', 'DELIVERED']) {
        const text = render([item], status);
        assert.match(text, /Dispatched: 10 bags/);
        assert.match(text, /Received: 4 bags/);
        assert.match(text, /invoice for final amounts/);
    }
});
test('zero quantities and free prices never fall back to sample values', () => {
    const text = render([{ ...item, deliveringQuantity: 0, deliveredQuantity: 0, unitPrice: 0 }], 'PARTIALLY_DELIVERED');
    assert.match(text, /Dispatched: 0 bags/);
    assert.match(text, /Received: 0 bags/);
    assert.match(text, /Unit price: \u20b90.00/);
});
test('missing and invalid delivery item data show unavailable', () => {
    for (const value of [undefined, null, NaN, Infinity, -1]) {
        const text = render([{ product: null, deliveringQuantity: value, deliveredQuantity: value, unitPrice: value }], 'DELIVERED');
        assert.match(text, /Product unavailable/);
        assert.match(text, /Dispatched: Unavailable/);
        assert.match(text, /Received: Unavailable/);
        assert.match(text, /Unit price: Unavailable/);
        assert.doesNotMatch(text, /720|1440|Sunflower|kg/);
    }
});
test('four-decimal prices are preserved without inventing an invoice total', () => {
    const text = render([{ ...item, unitPrice: 1234.5678 }]);
    assert.match(text, /Unit price: \u20b91,234.5678/);
    assert.doesNotMatch(text, /12,345/);
});
test('empty deliveries have a missing-items message', () => {
    assert.match(render([]), /No delivery items available/);
});
