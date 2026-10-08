const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/services/reporting.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsObject });
const { paymentPresentation, reportMoney, salesTrendBars } = exportsObject;
for (const [type, direction, label, sign] of [
    ['SALE', 'incoming', 'Sale invoice #12', '+'],
    ['CUSTOMER', 'incoming', 'Customer collection #12', '+'],
    ['PURCHASE', 'outgoing', 'Purchase invoice #12', '-'],
    ['SUPPLIER', 'outgoing', 'Supplier payment #12', '-'],
]) test(type + ' payments have the correct direction and reference', () => {
    const item = paymentPresentation({ referenceType: type, referenceId: 12 });
    assert.equal(item.direction, direction); assert.equal(item.label, label); assert.equal(item.sign, sign);
});
test('unknown payment types do not pretend to be purchase payments', () => {
    const item = paymentPresentation({ referenceType: 'OTHER' });
    assert.equal(item.direction, 'unknown'); assert.equal(item.sign, ''); assert.equal(item.status, 'Direction unknown');
});
test('missing totals differ from actual zero and preserve monetary precision', () => {
    assert.equal(reportMoney(null), '—'); assert.equal(reportMoney(undefined), '—');
    assert.equal(reportMoney(0), '₹0.00'); assert.equal(reportMoney(1234.5), '₹1,234.50');
});
test('trend bars use actual dates and values rather than sample data', () => {
    const bars = salesTrendBars({ trend: [{ date: '2026-08-31', amount: 100 }, { date: '2026-09-01', amount: 200 }] });
    assert.equal(bars[0].amount, 50); assert.equal(bars[1].amount, 100);
    assert.equal(bars[1].peak, true); assert.equal(bars[0].day, '08-31'); assert.equal(bars[1].label, '₹200.00');
});
test('empty days have no invented peak and unavailable reports have no bars', () => {
    assert.equal(salesTrendBars(null).length, 0);
    const bars = salesTrendBars({ trend: [{ date: '2026-09-01', amount: 0 }] });
    assert.equal(bars[0].amount, 0); assert.equal(bars[0].peak, false);
});
