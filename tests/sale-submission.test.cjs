// Execute the production submit handler with UI/network/storage dependencies stubbed.
// This checks its effects without starting Expo or contacting a real backend.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/sales/submitSale.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

class OrganizationSessionChangedError extends Error {}
const moneyExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/paymentAmounts.ts'), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: moneyExports });
function setup({ online = true, error, offlineError } = {}) {
    const state = { posts: 0, offlineWrites: 0, receipts: 0, formOpen: true, submitting: false, alerts: [], bill: null };
    const exports = {};
    const context = {
        
        lineItems: [{ productId: 1, productName: 'Rice', quantity: '1', price: '100' }],
        orderBookingMode: 'INSTANT_INVOICE', selectedCustomer: null, paymentMode: 'CASH',
        customerSearch: '', activeOrgId: 1, discountValue: 0,
        calculatedSubtotal: 100, cgstAmount: 2.5, sgstAmount: 2.5, calculatedGrandTotal: 105,
        effectivePaidAmount: 105, effectiveBalanceDue: 0, isOnline: online,
        Alert: { alert: (...args) => state.alerts.push(args) },
        api: { post: async () => { state.posts++; if (error) throw error; return { data: { id: 9, paidAmount: 105, balanceDue: 0 } }; } },
        syncService: { createOfflineSale: async () => {
            state.offlineWrites++;
            if (offlineError) throw offlineError;
            return { id: 'offline', isOffline: true, syncStatus: 'PENDING_SYNC' };
        } },
        setSubmitting: value => { state.submitting = value; },
        setSelectedBill: value => { state.bill = value; },
        setBillItems() {}, setIsReprintMode() {},
        setCreateModalVisible: value => { state.formOpen = value; },
        setBillModalVisible: value => { if (value) state.receipts++; },
        setSalesList() {}, fetchSales() {}, refreshPendingCount: async () => {},
    };
    vm.runInNewContext(compiled, { exports, require: name => {
        if (name === '../../services/api') return { OrganizationSessionChangedError };
        if (name === '../../utils/paymentAmounts') return moneyExports;
        throw new Error(`Unexpected dependency: ${name}`);
    } });
    return { state, context, submit: () => exports.submitSale(context) };
}

for (const order of [false, true]) {
    test(`${order ? 'order' : 'invoice'} rejects malformed selected lines without dropping them`, async () => {
        for (const [field, value] of [['quantity', '1abc'], ['quantity', '0'], ['quantity', ''], ['quantity', '-1'],
            ['quantity', 'Infinity'], ['price', '12abc'], ['price', ''], ['price', '0'], ['price', 'NaN'],
            ['price', '1000000000000000'], ['price', '123456789012345.6789']]) {
            const { state, context, submit } = setup({ online: !order });
            context.orderBookingMode = order ? 'SALES_ORDER' : 'INSTANT_INVOICE';
            context.selectedCustomer = { id: 2 };
            context.lineItems.push({ ...context.lineItems[0], [field]: value });
            await submit();
            assert.equal(state.posts, 0, `${field}=${value}`); assert.equal(state.offlineWrites, 0);
            assert.equal(state.alerts[0][0], 'Invalid Sale Details');
            assert.equal(state.submitting, false);
        }
    });
}
test('sales order rejects fractional quantity and unsupported price precision', async () => {
    for (const [field, value] of [['quantity', '1.5'], ['quantity', '2147483648'], ['price', '10.075']]) {
        const { state, context, submit } = setup(); context.orderBookingMode = 'SALES_ORDER';
        context.selectedCustomer = { id: 2 }; context.lineItems[0][field] = value;
        await submit(); assert.equal(state.posts, 0); assert.equal(state.alerts[0][0], 'Invalid Sale Details');
    }
});
test('sales order sends whole quantity and exact two-decimal price', async () => {
    const { context, submit } = setup(); context.orderBookingMode = 'SALES_ORDER';
    context.selectedCustomer = { id: 2, customerName: 'Shop' }; context.orderNotes = '';
    context.lineItems[0].quantity = '2.000'; context.lineItems[0].price = '10.2500';
    let payload; context.api.post = async (url, value) => { payload = value; return { data: { orderNumber: 'SO-1' } }; };
    await submit(); assert.equal(payload.items[0].quantity, 2); assert.equal(payload.items[0].unitPrice, 10.25);
});
for (const online of [true, false]) {
    test(`fractional instant invoice preserves validated values ${online ? 'online' : 'offline'}`, async () => {
        const { context, submit } = setup({ online });
        context.lineItems[0].quantity = '.125'; context.lineItems[0].price = '80.6000';
        context.discountInput = '0.0750';
        let payload;
        context.api.post = async (url, value) => { payload = value; return { data: { id: 9 } }; };
        context.syncService.createOfflineSale = async (org, value) => { payload = value; return { syncStatus: 'PENDING_SYNC' }; };
        await submit(); assert.equal(payload.items[0].quantity, .125); assert.equal(payload.items[0].price, 80.6);
        assert.equal(payload.discount, .075);
    });
}
test('invalid or excessive discount cannot create either kind of sale', async () => {
    for (const mode of ['INSTANT_INVOICE', 'SALES_ORDER']) {
        for (const input of ['2oops', '-1', 'NaN', '101', mode === 'SALES_ORDER' ? '.001' : '.00001']) {
            const { state, context, submit } = setup(); context.orderBookingMode = mode;
            context.discountInput = input; context.selectedCustomer = { id: 2 };
            await submit(); assert.equal(state.posts, 0); assert.equal(state.offlineWrites, 0);
            assert.equal(state.alerts[0][0], 'Invalid Sale Details');
        }
    }
});
test('invoice quantity precision and range are validated before offline storage', async () => {
    for (const quantity of ['.0000001', '10000000000000']) {
        const { state, context, submit } = setup({ online: false }); context.lineItems[0].quantity = quantity;
        await submit(); assert.equal(state.offlineWrites, 0); assert.equal(state.alerts[0][0], 'Invalid Sale Details');
    }
});

for (const online of [true, false]) {
    test(`exact-limit partial sale succeeds ${online ? 'online' : 'offline'} with fresh paid amount`, async () => {
        const { context, submit } = setup({ online });
        context.paymentMode = 'PARTIAL'; context.paidAmountInput = '0.10'; context.calculatedGrandTotal = .3;
        context.selectedCustomer = { id: 2, creditLimit: .3, creditBalance: .1 };
        context.effectivePaidAmount = 999; context.effectiveBalanceDue = 999;
        let payload;
        context.api.post = async (url, value) => { payload = value; return { data: { id: 9 } }; };
        context.syncService.createOfflineSale = async (org, value) => { payload = value; return { syncStatus: 'PENDING_SYNC' }; };
        await submit();
        assert.equal(payload.paidAmount, .1);
    });
}
test('one paisa over the credit limit blocks all writes', async () => {
    const { state, context, submit } = setup();
    context.paymentMode = 'CREDIT'; context.calculatedGrandTotal = .21;
    context.selectedCustomer = { id: 2, creditLimit: .3, creditBalance: .1 };
    await submit();
    assert.equal(state.posts, 0); assert.equal(state.offlineWrites, 0);
    assert.equal(state.alerts[0][0], 'Credit Limit Exceeded');
});
test('invalid or full partial payments block submission', async () => {
    for (const paid of ['', '0', '-1', '1oops', '0.001', 'Infinity', 'NaN', '.1', '0.30', '0.31']) {
        const { state, context, submit } = setup();
        context.paymentMode = 'PARTIAL'; context.paidAmountInput = paid; context.calculatedGrandTotal = .3;
        context.selectedCustomer = { id: 2, creditLimit: 0, creditBalance: 0 };
        await submit();
        assert.equal(state.posts, 0, paid); assert.equal(state.offlineWrites, 0, paid);
        assert.equal(state.alerts[0][0], 'Invalid Paid Amount', paid);
    }
});
test('missing customer credit data cannot silently become unlimited credit', async () => {
    const { state, context, submit } = setup();
    context.paymentMode = 'CREDIT'; context.selectedCustomer = { id: 2 };
    await submit();
    assert.equal(state.posts, 0); assert.equal(state.alerts[0][0], 'Customer Balance Unavailable');
});

test('interstate selection and product rates are sent with an instant invoice', async () => {
    const { context, submit } = setup();
    context.taxType = 'INTER_STATE';
    context.lineItems[0].gstRate = 18;
    let payload;
    context.api.post = async (url, value) => { payload = value; return { data: { id: 9 } }; };
    await submit();
    assert.equal(payload.taxType, 'INTER_STATE');
    assert.equal(payload.items[0].gstRate, 18);
});
test('No GST stays null in an offline invoice with the selected supply type', async () => {
    const { context, submit } = setup({ online: false });
    context.taxType = 'INTER_STATE'; context.igstAmount = 0;
    context.lineItems[0].gstRate = null;
    let payload;
    context.syncService.createOfflineSale = async (org, value) => { payload = value; return { syncStatus: 'PENDING_SYNC' }; };
    await submit();
    assert.equal(payload.taxType, 'INTER_STATE'); assert.equal(payload.igst, 0);
    assert.equal(payload.items[0].gstRate, null);
});

for (const [status, message] of [[400, 'Invalid sale'], [401, 'Sign in required'], [403, 'Not permitted'],
    [409, 'Insufficient stock'], [422, 'Credit limit exceeded'], [429, 'Too many requests']]) {
    test(`HTTP ${status} remains a visible failure without an offline sale`, async () => {
        const { state, submit } = setup({ error: { response: { status, data: { message } } } });
        await submit();
        assert.equal(state.posts, 1); assert.equal(state.offlineWrites, 0);
        assert.equal(state.receipts, 0); assert.equal(state.formOpen, true); assert.equal(state.submitting, false);
        assert.deepEqual(state.alerts[0], ['Sale Not Saved', message]);
    });
}
for (const [name, error] of [
    ['timeout', { code: 'ECONNABORTED' }], ['network disconnect', { code: 'ERR_NETWORK' }],
    ['HTTP timeout', { response: { status: 408 } }], ['server error', { response: { status: 500 } }],
]) {
    test(`${name} cannot generate a duplicate offline invoice`, async () => {
        const { state, submit } = setup({ error }); await submit();
        assert.equal(state.offlineWrites, 0); assert.equal(state.receipts, 0); assert.equal(state.formOpen, true);
        assert.equal(state.alerts[0][0], 'Sale Not Confirmed'); assert.match(state.alerts[0][1], /sales history/);
    });
}
test('a shop change cannot queue the sale or show success', async () => {
    const { state, submit } = setup({ error: new OrganizationSessionChangedError() }); await submit();
    assert.equal(state.offlineWrites, 0); assert.equal(state.receipts, 0); assert.equal(state.alerts[0][0], 'Shop Changed');
});
test('confirmed online sale opens its server receipt without an offline write', async () => {
    const { state, submit } = setup(); await submit();
    assert.equal(state.offlineWrites, 0); assert.equal(state.receipts, 1); assert.equal(state.bill.id, 9);
    assert.equal(state.formOpen, false); assert.equal(state.submitting, false);
});
test('starting offline still creates one pending invoice', async () => {
    const { state, submit } = setup({ online: false }); await submit();
    assert.equal(state.posts, 0); assert.equal(state.offlineWrites, 1); assert.equal(state.receipts, 1);
    assert.equal(state.bill.syncStatus, 'PENDING_SYNC'); assert.equal(state.bill.isOffline, true);
});
test('a failed offline write is not retried automatically or shown as successful', async () => {
    const { state, submit } = setup({ online: false, offlineError: new Error('Storage unavailable') }); await submit();
    assert.equal(state.offlineWrites, 1); assert.equal(state.receipts, 0); assert.equal(state.formOpen, true);
    assert.equal(state.submitting, false); assert.equal(state.alerts[0][0], 'Offline Save Failed');
});
