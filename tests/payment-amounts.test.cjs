const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const money = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/paymentAmounts.ts'), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: money });

test('partial-payment preview leaves exact paisa balances', () => {
    for (const [total, paid, due] of [[.3, '0.1', .2], [1, '0.99', .01], [1000.01, '999.99', .02]]) {
        const result = money.salePaymentAmounts(total, 'PARTIAL', paid);
        assert.equal(result.valid, true); assert.equal(result.balanceDue, due);
        assert.equal(money.balanceAfterPayment(total, result.paidAmount), due);
    }
});
test('credit and fully paid previews retain their existing meaning', () => {
    assert.equal(money.salePaymentAmounts(.3, 'CREDIT').balanceDue, .3);
    for (const mode of ['CASH', 'UPI', 'CARD']) {
        assert.equal(money.salePaymentAmounts(.3, mode).paidAmount, .3);
        assert.equal(money.salePaymentAmounts(.3, mode).balanceDue, 0);
    }
});
test('credit checks include exact four-decimal existing balances and unlimited policy', () => {
    assert.equal(money.exceedsCreditLimit(.1, .3, .2), false);
    assert.equal(money.exceedsCreditLimit(.1001, .3, .2), true);
    assert.equal(money.exceedsCreditLimit(999, 0, 100), false);
    assert.equal(money.exceedsCreditLimit(NaN, 100, 1), null);
});
test('offline balances reject invalid precision and overpayment', () => {
    for (const [total, paid] of [[.3, .31], [.3, -.1], [.3, .001], [NaN, 0], [1, Infinity]])
        assert.throws(() => money.balanceAfterPayment(total, paid));
});
