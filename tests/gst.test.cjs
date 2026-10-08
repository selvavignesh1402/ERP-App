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
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
            jsx: ts.JsxEmit.React, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name) });
    return exports;
}
const gst = load('src/features/sales/gst.ts');

test('half-paisa totals round up without binary floating-point drift', () => {
    for (const type of ['INTRA_STATE', 'INTER_STATE']) {
        const total = gst.calculateGst([{ quantity: '1', price: '10.075', gstRate: null }], '0', type);
        assert.equal(total.subtotal, 10.08);
        assert.equal(total.grandTotal, 10.08);
        const discounted = gst.calculateGst([{ quantity: '1', price: '20.15' }], '10.075', type);
        assert.equal(discounted.grandTotal, 10.08);
    }
});

test('interstate and split-state taxes round half-paisa buckets up', () => {
    const interstate = gst.calculateGst([{ quantity: '1', price: '201.51', gstRate: 5 }], '.01', 'INTER_STATE');
    assert.equal(interstate.igst, 10.08);
    assert.equal(interstate.grandTotal, 211.58);
    const local = gst.calculateGst([{ quantity: '1', price: '403', gstRate: 5 }], 0, 'INTRA_STATE');
    assert.equal(local.cgst, 10.08); assert.equal(local.sgst, 10.08);
    assert.equal(local.grandTotal, 423.16);
});

test('fractional quantity and four-decimal prices multiply before rounding', () => {
    const total = gst.calculateGst([{ quantity: '.125', price: '80.6000' }], 0, 'INTER_STATE');
    assert.equal(total.subtotal, 10.08); assert.equal(total.grandTotal, 10.08);
    const scientific = gst.calculateGst([{ quantity: '1e-6', price: '10000' }], 0, 'INTER_STATE');
    assert.equal(scientific.grandTotal, .01);
});

test('draft inputs never produce NaN or infinity', () => {
    for (const price of ['', 'abc', '12oops', 'Infinity', 'NaN', '-1', '1e999999']) {
        const total = gst.calculateGst([{ quantity: '1', price, gstRate: 5 }], '', 'INTRA_STATE');
        assert.equal(total.grandTotal, 0);
    }
    assert.equal(gst.calculateGst([{ quantity: '1.', price: '10.' }], '', 'INTER_STATE').grandTotal, 10);
});

test('same-rate split lines retain exact tax rounding with a discount', () => {
    const grouped = [{ quantity: '3', price: '10.075', gstRate: 18 }];
    const split = Array.from({ length: 3 }, () => ({ quantity: '1', price: '10.075', gstRate: 18 }));
    for (const type of ['INTRA_STATE', 'INTER_STATE']) {
        assert.deepEqual(gst.calculateGst(grouped, '.125', type), gst.calculateGst(split, '.125', type));
    }
});
test('mixed GST rates and exempt lines share discount proportionally', () => {
    const lines = [null, 5, 18].map(gstRate => ({ quantity: '1', price: '1000', gstRate }));
    const local = gst.calculateGst(lines, 300, 'INTRA_STATE');
    assert.equal(local.cgst, 103.5); assert.equal(local.sgst, 103.5);
    assert.equal(local.igst, 0); assert.equal(local.grandTotal, 2907);
    const interstate = gst.calculateGst(lines, 300, 'INTER_STATE');
    assert.equal(interstate.cgst, 0); assert.equal(interstate.sgst, 0);
    assert.equal(interstate.igst, 207); assert.equal(interstate.grandTotal, 2907);
});
test('empty GST never falls back to five percent', () => {
    for (const type of ['INTRA_STATE', 'INTER_STATE']) {
        const total = gst.calculateGst([{ quantity: 2, price: 100, gstRate: null }], 20, type);
        assert.equal(total.grandTotal, 180);
        assert.equal(total.cgst + total.sgst + total.igst, 0);
    }
});
test('same-rate split lines keep invoice rounding and full discounts remove tax', () => {
    const total = gst.calculateGst([{ quantity: 1, price: .1, gstRate: 5 }, { quantity: 1, price: .2, gstRate: 5 }], 0, 'INTRA_STATE');
    assert.equal(total.cgst, .01); assert.equal(total.sgst, .01); assert.equal(total.grandTotal, .32);
    assert.equal(gst.calculateGst([{ quantity: 1, price: 100, gstRate: 18 }], 100, 'INTER_STATE').igst, 0);
    assert.equal(gst.calculateGst([{ quantity: 1, price: 100, gstRate: 18 }], 150, 'INTER_STATE').discountExceedsSubtotal, true);
    assert.equal(gst.calculateGst([{ quantity: 1, price: 100, gstRate: 18 }], 50, 'INTER_STATE').discountExceedsSubtotal, false);
});
test('product GST selector hides rates for No GST, offers rates for Yes and clears on No', () => {
    const { GstSelector } = load('src/components/GstSelector.tsx', {
        'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button' },
        '../features/sales/gst': gst,
    });
    function Form() {
        const [value, setValue] = React.useState(null);
        return React.createElement(GstSelector, { value, onChange: setValue });
    }
    let tree;
    Renderer.act(() => { tree = Renderer.create(React.createElement(Form)); });
    const button = text => tree.root.findAllByType('Button').find(b => b.findAllByType('Text').some(t => t.props.children === text));
    assert.equal(button('18%'), undefined);
    Renderer.act(() => button('Yes').props.onPress());
    assert.equal(button('5%').props.accessibilityState.selected, true);
    Renderer.act(() => button('18%').props.onPress());
    assert.equal(button('18%').props.accessibilityState.selected, true);
    Renderer.act(() => button('No GST').props.onPress());
    assert.equal(button('No GST').props.accessibilityState.selected, true);
    assert.equal(button('18%'), undefined);
    Renderer.act(() => tree.unmount());
});
