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

const dispatchSource = fs.readFileSync(path.join(__dirname, '../src/features/delivery/dispatch.ts'), 'utf8');
const compiledDispatch = ts.transpileModule(dispatchSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

const dispatchExports = {};
vm.runInNewContext(compiledDispatch, { exports: dispatchExports });
const { dispatchItems } = dispatchExports;

class OrganizationSessionChangedError extends Error {}
const moneyExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/paymentAmounts.ts'), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: moneyExports });

test('submitSale consolidates duplicate product lines so dispatchItems succeeds without error', async () => {
    let bookedPayload = null;
    const exports = {};
    const context = {
        lineItems: [
            { productId: 10, productName: 'Sona Masoori Rice 25kg', quantity: '5', price: '2800' },
            { productId: 10, productName: 'Sona Masoori Rice 25kg', quantity: '3', price: '2800' },
        ],
        orderBookingMode: 'SALES_ORDER',
        selectedCustomer: { id: 4, customerName: 'Shop A' },
        paymentMode: 'CASH',
        customerSearch: '',
        activeOrgId: 1,
        discountValue: 0,
        calculatedSubtotal: 22400,
        cgstAmount: 0,
        sgstAmount: 0,
        calculatedGrandTotal: 22400,
        effectivePaidAmount: 22400,
        effectiveBalanceDue: 0,
        isOnline: true,
        Alert: { alert: () => {} },
        api: {
            post: async (url, data) => {
                bookedPayload = data;
                return { data: { id: 99, orderNumber: 'SO-99', items: data.items } };
            },
        },
        syncService: { createOfflineSale: async () => ({}) },
        setSubmitting: () => {},
        setSelectedBill: () => {},
        setBillItems: () => {},
        setIsReprintMode: () => {},
        setCreateModalVisible: () => {},
        setBillModalVisible: () => {},
        setSalesList: () => {},
        fetchSales: () => {},
        fetchSalesOrders: () => {},
        refreshPendingCount: async () => {},
    };

    vm.runInNewContext(compiled, {
        exports,
        require: (name) => {
            if (name === '../../services/api') return { OrganizationSessionChangedError };
            if (name === '../../utils/paymentAmounts') return moneyExports;
            throw new Error(`Unexpected dependency: ${name}`);
        },
    });

    await exports.submitSale(context);

    assert.ok(bookedPayload, 'Order payload was submitted');
    // Payload items must be consolidated to a single item for productId 10
    assert.equal(bookedPayload.items.length, 1);
    assert.equal(bookedPayload.items[0].productId, 10);
    assert.equal(bookedPayload.items[0].quantity, 8); // 5 + 3

    // Now verify that dispatchItems can successfully dispatch this consolidated order without throwing
    const dispatchable = bookedPayload.items.map((it) => ({
        product: { id: it.productId, productName: 'Sona Masoori' },
        availableQuantity: it.quantity,
    }));
    const quantities = { 10: '8' };
    const dispatched = dispatchItems(dispatchable, quantities);
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].productId, 10);
    assert.equal(dispatched[0].deliveringQuantity, 8);
});
