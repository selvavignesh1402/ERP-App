// Isolated tests: real Axios interceptors, in-memory storage, no server/database.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');
const stateKey = '@offline_state_v2_1';
const response = (config, results) => ({ data: { results }, status: 200, statusText: 'OK', headers: {}, config });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function setup() {
    const storage = new Map();
    const requests = [];
    let beforeRead = async () => {};
    let beforeWrite = async () => {};
    const localStorage = {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key),
    };
    function load(file, overrides = {}) {
        const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
        const js = ts.transpileModule(source, { compilerOptions: {
            module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
        } }).outputText;
        const exports = {};
        vm.runInNewContext(js, {
            exports, require: name => overrides[name] ?? require(name),
            window: { localStorage }, process: { env: {} }, __DEV__: true, URL,
            console: { error() {}, log() {} },
        }, { filename: file });
        return exports;
    }
    const auth = load('src/services/api.ts', {
        axios, 'react-native': { Platform: { OS: 'web' } },
        'expo-secure-store': {}, 'expo-constants': {},
    });
    auth.default.defaults.adapter = async config => {
        requests.push(config);
        return { data: { results: [{ clientReferenceId: 'queued', status: 'SYNCED', serverSaleId: 9 }], successCount: 1 },
            status: 200, statusText: 'OK', headers: {}, config };
    };
    const reloadSyncService = () => load('src/services/syncService.ts', {
        '../utils/paymentAmounts': load('src/utils/paymentAmounts.ts'),
        '../utils/offlineStock': load('src/utils/offlineStock.ts'),
        './api': auth,
        '@react-native-async-storage/async-storage': {
            getItem: async key => { await beforeRead(key); return storage.get(key) ?? null; },
            setItem: async (key, value) => { await beforeWrite(key, value); storage.set(key, value); },
        },
    }).syncService;
    const syncService = reloadSyncService();
    const { collectCustomerPayment, getPendingCustomerPayment } = load('src/services/paymentCollection.ts', {
        './api': auth,
        '@react-native-async-storage/async-storage': {
            getItem: async key => storage.get(key) ?? null,
            setItem: async (key, value) => { storage.set(key, value); },
            removeItem: async key => { storage.delete(key); },
        },
    });
    function select(token, org) { auth.setToken(token); auth.verifyOrganizationSession(token, org); }
    const sale = { clientReferenceId: 'queued', customerName: 'Test', paymentMode: 'CASH', discount: 0,
        total: 10, grandTotal: 10, cgst: 0, sgst: 0,
        items: [{ productId: 1, quantity: 1, price: 10 }] };
    return { auth, syncService, reloadSyncService, collectCustomerPayment, getPendingCustomerPayment, select, storage, requests, sale,
        onRead: fn => { beforeRead = fn; }, onWrite: fn => { beforeWrite = fn; } };
}

test('offline partial invoice stores an exact paisa balance', async () => {
    const { select, storage, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [], [{ id: 2, creditBalance: 0, creditLimit: 0 }]);
    const created = await syncService.createOfflineSale(1, { ...sale, customerId: 2, paymentMode: 'CREDIT', grandTotal: .3, paidAmount: .1 });
    assert.equal(created.balanceDue, .2);
    const state = JSON.parse(storage.get(stateKey));
    assert.equal(state.queue[0].balanceDue, .2); assert.equal(state.history[0].balanceDue, .2);
});

test('offline customer debt includes only unpaid amount and blocks the next over-limit sale', async () => {
    const { select, storage, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [], [{ id: 2, creditBalance: .1, creditLimit: .3 }, { id: 3, creditBalance: 9, creditLimit: 0 }]);
    await syncService.createOfflineSale(1, { ...sale, customerId: 2, paymentMode: 'CREDIT', grandTotal: .3, paidAmount: .1 });
    const customers = (await syncService.getCachedCatalog(1)).customers;
    assert.equal(customers[0].creditBalance, .3); assert.equal(customers[1].creditBalance, 9);
    const before = storage.get(stateKey);
    await assert.rejects(syncService.createOfflineSale(1, { ...sale, customerId: 2, paymentMode: 'CREDIT', grandTotal: .01 }), /credit limit/);
    assert.equal(storage.get(stateKey), before);
});

test('concurrent offline credit invoices cannot each reuse the same remaining limit', async () => {
    const { select, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [], [{ id: 2, creditBalance: 0, creditLimit: 10 }]);
    const payload = { ...sale, customerId: 2, paymentMode: 'CREDIT', grandTotal: 6 };
    const results = await Promise.allSettled([syncService.createOfflineSale(1, payload), syncService.createOfflineSale(1, payload)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await syncService.getCachedCatalog(1)).customers[0].creditBalance, 6);
    assert.equal((await syncService.getPendingQueue(1)).length, 1);
});

test('customer refresh overlays pending debt once and stops after confirmed sync', async () => {
    const { auth, select, sale, syncService } = setup(); select('a', 1);
    const customers = [{ id: 2, creditBalance: .1, creditLimit: 0 }];
    await syncService.cacheCatalog(1, [], customers);
    const created = await syncService.createOfflineSale(1, { ...sale, customerId: 2, paymentMode: 'CREDIT', grandTotal: .2 });
    for (let i = 0; i < 2; i++) {
        const cached = await syncService.cacheCatalog(1, [], customers);
        assert.equal(cached.customers[0].creditBalance, .3);
    }
    assert.equal(customers[0].creditBalance, .1);
    auth.default.defaults.adapter = async config => response(config, [{ clientReferenceId: created.clientReferenceId, status: 'SYNCED', serverSaleId: 9 }]);
    assert.equal((await syncService.processSyncQueue(1)).success, true);
    const refreshed = await syncService.cacheCatalog(1, [], [{ ...customers[0], creditBalance: .3 }]);
    assert.equal(refreshed.customers[0].creditBalance, .3);
});

test('offline credit requires cached valid customer details', async () => {
    const { select, storage, sale, syncService } = setup(); select('a', 1);
    for (const customers of [[], [{ id: 2, creditBalance: null, creditLimit: 10 }], [{ id: 2, creditBalance: 0 }]]) {
        await syncService.cacheCatalog(1, [], customers);
        const before = storage.get(stateKey);
        await assert.rejects(syncService.createOfflineSale(1, { ...sale, customerId: 2, paymentMode: 'CREDIT' }));
        assert.equal(storage.get(stateKey), before);
    }
});

test('failed offline credit save changes neither customer debt nor invoice queue', async () => {
    const s = setup(); s.select('a', 1);
    await s.syncService.cacheCatalog(1, [], [{ id: 2, creditBalance: 0, creditLimit: 0 }]);
    const before = s.storage.get(stateKey);
    s.onWrite(async () => { throw new Error('Storage full'); });
    await assert.rejects(s.syncService.createOfflineSale(1, { ...s.sale, customerId: 2, paymentMode: 'CREDIT' }));
    assert.equal(s.storage.get(stateKey), before);
});

test('fully paid offline sale does not add customer debt', async () => {
    const { select, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [], [{ id: 2, creditBalance: .1, creditLimit: 0 }]);
    await syncService.createOfflineSale(1, { ...sale, customerId: 2 });
    assert.equal((await syncService.getCachedCatalog(1)).customers[0].creditBalance, .1);
});

test('older version-two caches add pending customer debt exactly once across reloads', async () => {
    const { select, storage, sale, syncService, reloadSyncService } = setup(); select('a', 1);
    const queued = { ...sale, customerId: 2, paymentMode: 'CREDIT', grandTotal: .3, paidAmount: .1 };
    storage.set(stateKey, JSON.stringify({ version: 2, queue: [queued], history: [queued], products: [],
        customers: [{ id: 2, creditBalance: .1, creditLimit: 1 }] }));
    assert.equal((await syncService.getCachedCatalog(1)).customers[0].creditBalance, .3);
    assert.equal((await reloadSyncService().getCachedCatalog(1)).customers[0].creditBalance, .3);
    assert.equal(JSON.parse(storage.get(stateKey)).pendingCreditIncluded, true);
});

test('fractional offline sales exhaust cached stock exactly', async () => {
    const { select, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [{ id: 1, stock: .3, availableStock: .3 }], []);
    for (const quantity of [.1, .2])
        await syncService.createOfflineSale(1, { ...sale, items: [{ productId: 1, quantity, price: 10 }] });
    const product = (await syncService.getCachedCatalog(1)).products[0];
    assert.equal(product.stock, 0); assert.equal(product.availableStock, 0);
});

test('catalog refresh reapplies pending deductions once without changing server input', async () => {
    const { select, sale, syncService } = setup(); select('a', 1);
    const products = [{ id: 1, stock: 10, availableStock: 8 }];
    await syncService.cacheCatalog(1, products, []);
    await syncService.createOfflineSale(1, { ...sale, items: [{ productId: 1, quantity: 2, price: 10 }] });
    for (let i = 0; i < 2; i++) {
        const catalog = await syncService.cacheCatalog(1, products, [], await syncService.getCatalogRevision(1));
        assert.equal(catalog.products[0].stock, 8); assert.equal(catalog.products[0].availableStock, 6);
    }
    assert.equal(products[0].stock, 10); assert.equal(products[0].availableStock, 8);
});

test('response started before an offline sale cannot overwrite its stock', async () => {
    const { select, sale, storage, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [{ id: 1, stock: 10, availableStock: 10 }], []);
    const revision = await syncService.getCatalogRevision(1);
    await syncService.createOfflineSale(1, sale);
    const before = storage.get(stateKey);
    await assert.rejects(syncService.cacheCatalog(1, [{ id: 1, stock: 10, availableStock: 10 }], [], revision), /Stock changed/);
    assert.equal(storage.get(stateKey), before);
});

test('older overlapping refresh cannot replace a newer catalog', async () => {
    const { select, storage, syncService } = setup(); select('a', 1);
    const revision = await syncService.getCatalogRevision(1);
    await syncService.cacheCatalog(1, [{ id: 1, stock: 7, availableStock: 7 }], [], revision);
    const before = storage.get(stateKey);
    await assert.rejects(syncService.cacheCatalog(1, [{ id: 1, stock: 10, availableStock: 10 }], [], revision));
    assert.equal(storage.get(stateKey), before);
});

test('sync invalidates old catalog responses and next refresh stops subtracting confirmed sales', async () => {
    const { auth, select, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [{ id: 1, stock: 10, availableStock: 10 }], []);
    const offline = await syncService.createOfflineSale(1, sale);
    const revision = await syncService.getCatalogRevision(1);
    auth.default.defaults.adapter = async config => response(config, [{ clientReferenceId: offline.clientReferenceId, status: 'SYNCED', serverSaleId: 9 }]);
    assert.equal((await syncService.processSyncQueue(1)).success, true);
    await assert.rejects(syncService.cacheCatalog(1, [{ id: 1, stock: 10, availableStock: 10 }], [], revision));
    const catalog = await syncService.cacheCatalog(1, [{ id: 1, stock: 9, availableStock: 9 }], [], await syncService.getCatalogRevision(1));
    assert.equal(catalog.products[0].stock, 9); assert.equal(catalog.products[0].availableStock, 9);
});

test('failed pending invoices remain accounted for when refreshed stock is lower', async () => {
    const { auth, select, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [{ id: 1, stock: 10, availableStock: 10 }], []);
    const offline = await syncService.createOfflineSale(1, { ...sale, items: [{ productId: 1, quantity: 2, price: 10 }] });
    auth.default.defaults.adapter = async config => response(config, [{ clientReferenceId: offline.clientReferenceId, status: 'FAILED', errorMessage: 'Check invoice' }]);
    await syncService.processSyncQueue(1);
    const catalog = await syncService.cacheCatalog(1, [{ id: 1, stock: 1, availableStock: null }], []);
    assert.equal(catalog.products[0].stock, 0); assert.equal(catalog.products[0].availableStock, null);
    assert.equal((await syncService.getPendingQueue(1)).length, 1);
});

test('duplicate product lines use their combined quantity and retain reservations', async () => {
    const { select, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [{ id: 1, stock: .5, availableStock: .3 }], []);
    await syncService.createOfflineSale(1, { ...sale, items: [.1, .2].map(quantity => ({ productId: 1, quantity, price: 10 })) });
    const product = (await syncService.getCachedCatalog(1)).products[0];
    assert.equal(product.stock, .2); assert.equal(product.availableStock, 0);
});

test('cached overselling cannot save a receipt, queue entry or stock change', async () => {
    for (const [stock, availableStock] of [[.5, .2], [.3, null]]) {
        const { select, storage, sale, syncService } = setup(); select('a', 1);
        await syncService.cacheCatalog(1, [{ id: 1, stock, availableStock }], []);
        const before = storage.get(stateKey);
        await assert.rejects(syncService.createOfflineSale(1, { ...sale,
            items: [.2, .2].map(quantity => ({ productId: 1, quantity, price: 10 })) }), /Insufficient cached stock/);
        assert.equal(storage.get(stateKey), before);
    }
});

test('unknown available stock stays unknown and unrelated products stay unchanged', async () => {
    const { select, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [{ id: 1, stock: 2, availableStock: null }, { id: 2, stock: 9, availableStock: null }], []);
    await syncService.createOfflineSale(1, sale);
    const products = (await syncService.getCachedCatalog(1)).products;
    assert.equal(products[0].stock, 1); assert.equal(products[0].availableStock, null);
    assert.equal(products[1].stock, 9); assert.equal(products[1].availableStock, null);
});

test('invalid offline quantities leave queue, history and stock unchanged', async () => {
    const { select, storage, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [{ id: 1, stock: 10, availableStock: 10 }], []);
    const before = storage.get(stateKey);
    for (const quantity of [0, -1, .0000001, NaN, Infinity]) {
        await assert.rejects(syncService.createOfflineSale(1, { ...sale, items: [{ productId: 1, quantity, price: 10 }] }));
        assert.equal(storage.get(stateKey), before);
    }
});

test('invalid offline payment cannot enqueue an invoice or change cached stock', async () => {
    const { select, storage, sale, syncService } = setup(); select('a', 1);
    await syncService.cacheCatalog(1, [{ id: 1, stock: 10 }], []);
    const before = storage.get(stateKey);
    for (const paidAmount of [-1, 10.01, .001, NaN, Infinity]) {
        await assert.rejects(syncService.createOfflineSale(1, { ...sale, paidAmount }));
        assert.equal(storage.get(stateKey), before);
    }
});

test('unverified or absent shop never falls back to shop 1', () => {
    const { auth } = setup();
    auth.setToken('a');
    assert.throws(() => auth.organizationRequestConfig(1));
    auth.verifyOrganizationSession('a', null);
    assert.throws(() => auth.organizationRequestConfig(1));
});

test('failed offline save reports failure without changing queue, history or stock', async () => {
    const s = setup(); s.select('a', 1);
    await s.syncService.cacheCatalog(1, [{ id: 1, stock: 10 }], []);
    const before = s.storage.get(stateKey);
    s.onWrite(async () => { throw new Error('Storage full'); });
    await assert.rejects(s.syncService.createOfflineSale(1, s.sale), /Storage full/);
    assert.equal(s.storage.get(stateKey), before);
});

test('concurrent saves preserve every receipt and stock deduction after reload', async () => {
    const s = setup(); s.select('a', 1);
    await s.syncService.cacheCatalog(1, [{ id: 1, stock: 10 }], []);
    const saved = await Promise.all(Array.from({ length: 5 }, () => s.syncService.createOfflineSale(1, s.sale)));
    const fresh = s.reloadSyncService();
    assert.equal((await fresh.getPendingQueue(1)).length, 5);
    assert.equal((await fresh.getCachedSalesHistory(1)).length, 5);
    assert.equal((await fresh.getCachedCatalog(1)).products[0].stock, 5);
    assert.equal(new Set(saved.map(sale => sale.clientReferenceId)).size, 5);
});

test('sale saved during sync survives its acknowledgement and overlapping sync calls share one request', async () => {
    const s = setup(); s.select('a', 1);
    const original = await s.syncService.createOfflineSale(1, s.sale);
    const started = deferred(), finish = deferred(); let calls = 0;
    s.auth.default.defaults.adapter = async config => {
        calls++; started.resolve(); await finish.promise;
        return response(config, [{ clientReferenceId: original.clientReferenceId, status: 'SYNCED', serverSaleId: 9 }]);
    };
    const first = s.syncService.processSyncQueue(1);
    await started.promise;
    const second = s.syncService.processSyncQueue(1);
    const added = await s.syncService.createOfflineSale(1, s.sale);
    await s.syncService.cacheSalesHistory(1, []);
    finish.resolve();
    assert.equal((await first).success, true); await second;
    assert.equal(calls, 1);
    const pending = await s.syncService.getPendingQueue(1);
    assert.equal(pending.length, 1); assert.equal(pending[0].clientReferenceId, added.clientReferenceId);
    assert.equal((await s.syncService.getCachedSalesHistory(1)).length, 2);
    await s.syncService.cacheSalesHistory(1, []);
    assert.equal((await s.syncService.getCachedSalesHistory(1)).length, 2);
});

test('failed acknowledgement write retains same reference for safe retry after reload', async () => {
    const s = setup(); s.select('a', 1);
    const sale = await s.syncService.createOfflineSale(1, s.sale);
    s.auth.default.defaults.adapter = async config => {
        assert.equal(JSON.parse(config.data)[0].clientReferenceId, sale.clientReferenceId);
        return response(config, [{ clientReferenceId: sale.clientReferenceId, status: 'ALREADY_SYNCED', serverSaleId: 9 }]);
    };
    s.onWrite(async () => { throw new Error('Storage full'); });
    assert.equal((await s.syncService.processSyncQueue(1)).success, false);
    assert.equal(JSON.parse(s.storage.get(stateKey)).queue.length, 1);
    s.onWrite(async () => {});
    const fresh = s.reloadSyncService();
    assert.equal((await fresh.processSyncQueue(1)).syncedCount, 1);
    assert.equal((await fresh.getPendingQueue(1)).length, 0);
    assert.equal((await fresh.getCachedSalesHistory(1)).length, 1);
});

test('partial and missing acknowledgements keep failed invoices and their reasons', async () => {
    const s = setup(); s.select('a', 1);
    const sales = await Promise.all([1, 2, 3].map(() => s.syncService.createOfflineSale(1, s.sale)));
    s.auth.default.defaults.adapter = async config => response(config, [
        { clientReferenceId: sales[0].clientReferenceId, status: 'SYNCED', serverSaleId: 9 },
        { clientReferenceId: sales[1].clientReferenceId, status: 'FAILED', errorMessage: 'Insufficient stock' },
    ]);
    const result = await s.syncService.processSyncQueue(1);
    assert.equal(result.success, false); assert.equal(result.syncedCount, 1); assert.equal(result.failedCount, 2);
    const pending = await s.reloadSyncService().getPendingQueue(1);
    assert.equal(pending[0].errorMessage, 'Insufficient stock');
    assert.match(pending[1].errorMessage, /did not confirm/);
});

test('unreadable storage is never treated as an empty queue or overwritten', async () => {
    const s = setup(); s.select('a', 1);
    s.storage.set(stateKey, '{broken');
    await assert.rejects(s.syncService.getPendingQueue(1));
    await assert.rejects(s.syncService.createOfflineSale(1, s.sale));
    assert.equal((await s.syncService.processSyncQueue(1)).success, false);
    assert.equal(s.requests.length, 0); assert.equal(s.storage.get(stateKey), '{broken');
    s.onRead(async () => { throw new Error('Storage unavailable'); });
    await assert.rejects(s.syncService.getCachedSalesHistory(1), /Storage unavailable/);
});

test('legacy migration preserves backups, repairs missing receipts and supports empty catalog refresh', async () => {
    const s = setup(); s.select('a', 1);
    const legacy = JSON.stringify([s.sale]); s.storage.set('@offline_sales_queue_1', legacy);
    s.onWrite(async () => { throw new Error('Storage full'); });
    await assert.rejects(s.syncService.getPendingQueue(1));
    assert.equal(s.storage.has(stateKey), false); assert.equal(s.storage.get('@offline_sales_queue_1'), legacy);
    s.onWrite(async () => {});
    assert.equal((await s.syncService.getCachedSalesHistory(1)).length, 1);
    await s.syncService.cacheCatalog(1, [{ id: 1, stock: 10, availableStock: 10 }], [{ id: 2 }]);
    await s.syncService.cacheCatalog(1, [], []);
    const catalog = await s.syncService.getCachedCatalog(1);
    assert.equal(catalog.products.length, 0); assert.equal(catalog.customers.length, 0);
    assert.equal((await s.syncService.getPendingQueue(1)).length, 1);
    assert.equal(s.storage.get('@offline_sales_queue_1'), legacy);
});

test('old screen request cannot use the newly selected shop token', async () => {
    const { auth, select, requests } = setup();
    select('a', 1);
    const oldScreen = auth.forOrganization(1);
    select('b', 2);
    await assert.rejects(oldScreen.post('/sales', {}), auth.OrganizationSessionChangedError);
    assert.equal(requests.length, 0);
    await auth.forOrganization(2).get('/sales');
    assert.equal(requests[0].headers.Authorization, 'Bearer b');
});

test('old profile lookup cannot verify the new session', async () => {
    const { auth, select, requests } = setup();
    select('b', 2);
    await assert.rejects(auth.me('a'), auth.OrganizationSessionChangedError);
    assert.throws(() => auth.verifyOrganizationSession('a', 1));
    assert.equal(requests.length, 0);
    assert.equal(auth.organizationRequestConfig(2).expectedToken, 'b');
});

test('late 401 for the old token does not log out the new shop', async () => {
    const { auth, select } = setup();
    select('a', 1);
    auth.default.defaults.adapter = async config => {
        select('b', 2);
        throw { config, response: { status: 401 } };
    };
    await assert.rejects(auth.forOrganization(1).get('/sales'));
    assert.equal(await auth.getToken(), 'b');
});

test('401 for current session still logs out', async () => {
    const { auth, select } = setup();
    select('a', 1);
    auth.default.defaults.adapter = async config => { throw { config, response: { status: 401 } }; };
    await assert.rejects(auth.forOrganization(1).get('/sales'));
    assert.equal(await auth.getToken(), null);
});

test('queue belonging to another shop is untouched and never posted', async () => {
    const { select, storage, sale, syncService, requests } = setup();
    storage.set('@offline_sales_queue_1', JSON.stringify([sale]));
    select('b', 2);
    assert.equal((await syncService.processSyncQueue(1)).success, false);
    assert.equal(requests.length, 0);
    assert.equal(JSON.parse(storage.get('@offline_sales_queue_1')).length, 1);
});

test('switch while reading queue prevents submission with the new token', async () => {
    const { select, storage, sale, syncService, requests, onRead } = setup();
    select('a', 1);
    storage.set('@offline_sales_queue_1', JSON.stringify([sale]));
    onRead(async () => select('b', 2));
    assert.equal((await syncService.processSyncQueue(1)).success, false);
    assert.equal(requests.length, 0);
    assert.equal(JSON.parse(storage.get('@offline_sales_queue_1')).length, 1);
});

test('selected shop queue syncs with its own token and leaves other queue intact', async () => {
    const { select, storage, sale, syncService, requests } = setup();
    select('b', 2);
    storage.set('@offline_sales_queue_1', JSON.stringify([sale]));
    storage.set('@offline_sales_queue_2', JSON.stringify([sale]));
    const result = await syncService.processSyncQueue(2);
    assert.equal(result.success, true);
    assert.equal(result.syncedCount, 1);
    assert.equal(requests[0].headers.Authorization, 'Bearer b');
    assert.equal(JSON.parse(storage.get('@offline_state_v2_2')).queue.length, 0);
    assert.equal(JSON.parse(storage.get('@offline_sales_queue_1')).length, 1);
});

test('wrong shop cannot read cached sales or create an offline sale', async () => {
    const { select, storage, sale, syncService } = setup();
    select('b', 2);
    storage.set('@offline_sales_history_1', JSON.stringify([sale]));
    assert.equal((await syncService.getCachedSalesHistory(1)).length, 0);
    await assert.rejects(syncService.createOfflineSale(1, sale));
    assert.equal(storage.has('@offline_sales_queue_1'), false);
});

test('partial collection and interstate product GST survive local storage and sync', async () => {
    const { auth, select, storage, syncService } = setup();
    select('a', 1);
    await syncService.cacheCatalog(1, [], [{ id: 2, creditBalance: 0, creditLimit: 0 }]);
    const offline = await syncService.createOfflineSale(1, {
        customerId: 2, customerName: 'Test', paymentMode: 'CREDIT', paidAmount: 400,
        initialPaymentMode: 'UPI', discount: 0, total: 1000, cgst: 0, sgst: 0, igst: 50, taxType: 'INTER_STATE', grandTotal: 1050,
        items: [{ productId: 1, productName: 'Rice', quantity: 1, price: 1000, gstRate: 5 }],
    });
    const stored = JSON.parse(storage.get('@offline_state_v2_1')).queue[0];
    assert.equal(stored.paidAmount, 400); assert.equal(stored.balanceDue, 650);
    assert.equal(stored.taxType, 'INTER_STATE'); assert.equal(stored.igst, 50);
    auth.default.defaults.adapter = async config => {
        const payload = JSON.parse(config.data)[0];
        assert.equal(payload.paidAmount, 400); assert.equal(payload.initialPaymentMode, 'UPI');
        assert.equal(payload.taxType, 'INTER_STATE'); assert.equal(payload.items[0].gstRate, 5);
        return { data: { results: [{ clientReferenceId: offline.clientReferenceId, status: 'SYNCED', serverSaleId: 9,
            sale: { id: 9, grandTotal: 1049, paidAmount: 400, balanceDue: 649 } }], successCount: 1 },
            status: 200, statusText: 'OK', headers: {}, config };
    };
    assert.equal((await syncService.processSyncQueue(1)).success, true);
    const history = JSON.parse(storage.get('@offline_state_v2_1')).history[0];
    assert.equal(history.paidAmount, 400); assert.equal(history.balanceDue, 649);
    assert.equal(history.grandTotal, 1049); assert.equal(history.isOffline, false);
});

test('legacy offline credit has no invented initial collection', async () => {
    const { auth, select, storage, sale, syncService } = setup(); select('a', 1);
    storage.set('@offline_sales_queue_1', JSON.stringify([{ ...sale, paymentMode: 'CREDIT' }]));
    auth.default.defaults.adapter = async config => {
        const payload = JSON.parse(config.data)[0];
        assert.equal(payload.paidAmount, undefined); assert.equal(payload.initialPaymentMode, undefined);
        return { data: { results: [] }, status: 200, statusText: 'OK', headers: {}, config };
    };
    await syncService.processSyncQueue(1);
});

test('uncertain payment retries reuse the stored request ID', async () => {
    const { auth, select, storage, collectCustomerPayment } = setup(); select('a', 1);
    const details = { referenceType: 'CUSTOMER', referenceId: 2, amount: 100, paymentMode: 'CASH' };
    let initialKey;
    auth.default.defaults.adapter = async config => {
        initialKey = JSON.parse(config.data).clientReferenceId;
        throw new Error('Network disconnected after submission');
    };
    await assert.rejects(collectCustomerPayment(1, 7, details));
    assert.equal(JSON.parse(storage.get('@pending_payment_1_7')).clientReferenceId, initialKey);
    await assert.rejects(collectCustomerPayment(1, 7, { ...details, amount: 50 }), /earlier payment/);
    auth.default.defaults.adapter = async config => {
        assert.equal(JSON.parse(config.data).clientReferenceId, initialKey);
        return { data: { id: 10 }, status: 200, statusText: 'OK', headers: {}, config };
    };
    assert.equal((await collectCustomerPayment(1, 7, details)).id, 10);
    assert.equal(storage.has('@pending_payment_1_7'), false);
});

test('a saved payment request from a previous app session is reused', async () => {
    const { auth, select, storage, collectCustomerPayment } = setup(); select('a', 1);
    const details = { referenceType: 'CUSTOMER', referenceId: 2, amount: 100, paymentMode: 'UPI' };
    storage.set('@pending_payment_1_7', JSON.stringify({ ...details, clientReferenceId: 'previous-session' }));
    auth.default.defaults.adapter = async config => {
        assert.equal(JSON.parse(config.data).clientReferenceId, 'previous-session');
        return { data: { id: 10 }, status: 200, statusText: 'OK', headers: {}, config };
    };
    await collectCustomerPayment(1, 7, details);
});

test('server failure restores exact saved payment after restart and retries without a new ID', async () => {
    const { auth, select, storage, collectCustomerPayment, getPendingCustomerPayment } = setup(); select('a', 1);
    const details = { referenceType: 'CUSTOMER', referenceId: 2, amount: 125, paymentMode: 'UPI' };
    auth.default.defaults.adapter = async config => { throw { config, response: { status: 500 } }; };
    await assert.rejects(collectCustomerPayment(1, 7, details));
    const pending = await getPendingCustomerPayment(1, 7);
    assert.equal(pending.amount, 125);
    assert.equal(pending.paymentMode, 'UPI');
    assert.equal(pending.referenceId, 2);
    assert.equal(await getPendingCustomerPayment(1, 8), null);
    assert.throws(() => auth.organizationRequestConfig(2));
    await assert.rejects(getPendingCustomerPayment(2, 7));
    let calls = 0;
    auth.default.defaults.adapter = async config => {
        calls++;
        assert.equal(JSON.parse(config.data).clientReferenceId, pending.clientReferenceId);
        return { data: { id: 10 }, status: 200, statusText: 'OK', headers: {}, config };
    };
    assert.equal((await collectCustomerPayment(1, 7, pending)).id, 10);
    assert.equal(calls, 1);
    assert.equal(await getPendingCustomerPayment(1, 7), null);
    assert.equal(storage.has('@pending_payment_1_7'), false);
});

test('rejected payment reports failure and permits correction', async () => {
    const { auth, select, storage, collectCustomerPayment } = setup(); select('a', 1);
    auth.default.defaults.adapter = async config => { throw { config, response: { status: 409, data: { message: 'Payment exceeds balance' } } }; };
    await assert.rejects(collectCustomerPayment(1, 7, { referenceType: 'CUSTOMER', referenceId: 2, amount: 100, paymentMode: 'CASH' }));
    assert.equal(storage.has('@pending_payment_1_7'), false);
});

test('double taps cannot submit two payments at once', async () => {
    const { auth, select, collectCustomerPayment } = setup(); select('a', 1);
    const details = { referenceType: 'CUSTOMER', referenceId: 2, amount: 100, paymentMode: 'CASH' };
    let finish;
    const completed = new Promise(resolve => { finish = resolve; });
    auth.default.defaults.adapter = async config => {
        await completed;
        return { data: { id: 10 }, status: 200, statusText: 'OK', headers: {}, config };
    };
    const first = collectCustomerPayment(1, 7, details);
    await assert.rejects(collectCustomerPayment(1, 7, details), /already being submitted/);
    finish(); await first;
});
