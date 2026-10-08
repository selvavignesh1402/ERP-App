const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
    const exports = {};
    const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(compiled, { exports, require: (name) => mocks[name] || require(name) });
    return exports;
}

const sharing = load('src/services/receiptSharing.ts');
const printing = load('src/services/receiptPrinting.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-print': {},
    './receiptSharing': sharing,
});

const bill = { id: 7, billNumber: 'INV-7', grandTotal: 5000, paidAmount: 500, balanceDue: 4500 };
const items = [{ productName: 'Rice Bag', quantity: 2, price: 2500 }];

test('receiptPrintHtml includes payment summary when showPayment is true or default', () => {
    const htmlDefault = printing.receiptPrintHtml('Shop A', bill, items);
    assert.match(htmlDefault, /Paid: ₹500.00 \| Balance due: ₹4500.00/);

    const htmlExplicit = printing.receiptPrintHtml('Shop A', bill, items, false, '80mm', { showPayment: true });
    assert.match(htmlExplicit, /Paid: ₹500.00 \| Balance due: ₹4500.00/);
});

test('receiptPrintHtml omits payment summary when showPayment is false', () => {
    const htmlHiddenPayment = printing.receiptPrintHtml('Shop A', bill, items, false, '80mm', { showPayment: false });
    assert.doesNotMatch(htmlHiddenPayment, /Balance due:/);
    assert.doesNotMatch(htmlHiddenPayment, /Paid:/);
    assert.match(htmlHiddenPayment, /Total Amount: ₹5000.00/);
});
