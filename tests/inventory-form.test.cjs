const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/inventory/productForm.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInNewContext(code, { exports: exportsObject, require });
const { buildProductPayload, adjustmentPayload, toInventoryItem, inventoryError } = exportsObject;
const form = (overrides = {}) => ({ name: 'Rice', brand: '', category: 'Other', weight: '2.5',
    purchasePrice: '80.125', sellingPrice: '100.25', stock: '2.5', minimumStock: '.5',
    gstRate: null, hsnCode: '', ...overrides });

test('product input preserves fractional stock, threshold, weight and price', () => {
    const result = buildProductPayload(form());
    assert.equal(result.stock, 2.5);
    assert.equal(result.minimumStock, .5);
    assert.equal(result.unit, '2.5kg');
    assert.equal(result.purchasePrice, 80.125);
    assert.equal(result.sellingPrice, 100.25);
    assert.equal(result.gstRate, null);
    assert.equal(result.hsnCode, null);
});

test('numeric fields reject junk, signed negatives, overflow and excess precision', () => {
    for (const field of ['weight', 'purchasePrice', 'sellingPrice', 'stock', 'minimumStock']) {
        for (const value of ['100abc', '-1', 'Infinity', 'NaN', '1e3', '0x10', '1,000', '9999999999999999999']) {
            assert.throws(() => buildProductPayload(form({ [field]: value })), undefined, `${field}: ${value}`);
        }
    }
    assert.throws(() => buildProductPayload(form({ sellingPrice: '1.00001' })));
    assert.throws(() => buildProductPayload(form({ stock: '1.0000001' })));
    assert.equal(buildProductPayload(form({ sellingPrice: '1.250000' })).sellingPrice, 1.25);
    assert.equal(buildProductPayload(form({ sellingPrice: '0001.2500' })).sellingPrice, 1.25);
    assert.throws(() => buildProductPayload(form({ sellingPrice: '90071992547409.1234' })), /rounding/);
});

test('missing purchase price is rejected instead of generating an invented cost', () => {
    assert.throws(() => buildProductPayload(form({ purchasePrice: '' })), /Purchase price/);
    assert.throws(() => buildProductPayload(form({ sellingPrice: '' })), /Selling price/);
    assert.throws(() => buildProductPayload(form({ sellingPrice: '0' })), /greater than zero/);
    assert.equal(buildProductPayload(form({ purchasePrice: '0' })).purchasePrice, 0);
    const result = buildProductPayload(form({ stock: ' ', minimumStock: ' ' }));
    assert.equal(result.stock, 0);
    assert.equal(result.minimumStock, 10);
});

test('adjustments retain remarks in the backend reason field and preserve fractional deductions', () => {
    const result = adjustmentPayload('12', '1.25', true, 'damage', ' Torn bag ');
    assert.equal(result.productId, 12);
    assert.equal(result.quantityChange, -1.25);
    assert.equal(result.reason, 'damage: Torn bag');
    assert.equal('notes' in result, false);
    assert.equal(adjustmentPayload('12', '1', false, 'recount', ' ').reason, 'recount');
    assert.throws(() => adjustmentPayload('12', '1', false, 'other', 'x'.repeat(255)), /255/);
    for (const quantity of ['0', '-1', '2abc', 'Infinity', '1.0000001'])
        assert.throws(() => adjustmentPayload('12', quantity, false, 'recount', ''));
});

test('catalog mapping does not invent GST, units or stock thresholds', () => {
    const item = toInventoryItem({ id: 3, productName: 'Rice', brand: null, unit: null,
        sellingPrice: 100, purchasePrice: 80, stock: 2.5, minimumStock: 0, gstRate: null, hsnCode: null });
    assert.equal(item.id, '3');
    assert.equal(item.stock, 2.5);
    assert.equal(item.minimumStock, 0);
    assert.equal(item.unit, '');
    assert.equal(item.gstRate, null);
    assert.throws(() => toInventoryItem({ id: null, productName: 'Rice' }), /identity/);
});

test('inventory errors show server messages only when they are strings', () => {
    assert.equal(inventoryError({ response: { data: { message: 'Reserved stock' } } }, 'Retry'), 'Reserved stock');
    for (const error of [null, new Error('Network'), { response: { data: { message: {} } } }])
        assert.equal(inventoryError(error, 'Retry'), 'Retry');
});
