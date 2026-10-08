const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/services/storeLedger.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, { exports: exportsObject });
const { storeLedgerRecords } = exportsObject;
test('store ledger includes direct and partial payments once and excludes other stores and purchases', () => {
    const sales = [{ id: 1, customer: { id: 102 }, grandTotal: 1000 }, { id: 2, customer: { id: 102 }, grandTotal: 500 },
        { id: 3, customer: { id: 103 }, grandTotal: 700 }];
    const payments = [
        { id: 1, referenceType: 'SALE', referenceId: 1, amount: 200 },
        { id: 2, referenceType: 'CUSTOMER', referenceId: 102, amount: 300, saleAllocations: { 1: 100, 2: 200 } },
        { id: 3, referenceType: 'CUSTOMER', referenceId: 103, amount: 900 },
        { id: 4, referenceType: 'SALE', referenceId: 3, amount: 700 },
        { id: 5, referenceType: 'PURCHASE', referenceId: 1, amount: 800 },
    ];
    const result = storeLedgerRecords(102, sales, payments);
    assert.equal(result.invoices.length, 2);
    assert.equal(result.receipts.length, 2);
    assert.equal(result.invoiced, 1500);
    assert.equal(result.received, 500);
});
test('opening balance collections appear without invoices and currency sums use cents', () => {
    const result = storeLedgerRecords(102, [], [
        { id: 1, referenceType: 'CUSTOMER', referenceId: 102, amount: 0.1, paymentDate: '2026-09-28T10:00:00' },
        { id: 2, referenceType: 'CUSTOMER', referenceId: 102, amount: 0.2, paymentDate: '2026-09-29T10:00:00' },
    ]);
    assert.equal(result.received, 0.3);
    assert.equal(result.receipts[0].id, 2);
    assert.equal(result.invoices.length, 0);
});
