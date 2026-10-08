const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, {
        exports,
        require: (name) => mocks[name] ?? require(name),
        console,
        Date,
        JSON,
        Math,
        Number,
        String,
        Promise,
        Set,
        Map,
        Array,
    });
    return exports;
}

test('syncService: corrupt JSON blob in AsyncStorage does not throw and recovers safely', async () => {
    const storage = new Map();
    // Simulate a truncated JSON blob written to storage
    storage.set('@offline_state_v2_3', '{"version":2,"queue":[{"clientReferenceId":"OFF-123",');

    const mockAsyncStorage = {
        getItem: async (k) => storage.get(k) ?? null,
        setItem: async (k, v) => storage.set(k, v),
        removeItem: async (k) => storage.delete(k),
    };

    const mockApi = {
        post: async () => ({ data: { results: [] } }),
    };

    const serviceMod = load('src/services/syncService.ts', {
        '@react-native-async-storage/async-storage': mockAsyncStorage,
        './api': {
            default: mockApi,
            organizationRequestConfig: () => ({ expectedToken: 'tok' }),
            OrganizationSessionChangedError: class extends Error {},
        },
        '../utils/offlineStock': {
            deductOfflineStock: (prods) => prods,
        },
        '../utils/paymentAmounts': {
            balanceAfterPayment: () => 0,
            addCreditBalance: () => 0,
        },
    });

    const { syncService } = serviceMod;

    // getPendingQueue should NOT throw; it should quarantine the corrupt blob and return an empty queue
    const queue = await syncService.getPendingQueue(3);
    assert.equal(queue.length, 0);

    // A backup copy must have been saved in storage
    const backupKeys = Array.from(storage.keys()).filter((k) => k.startsWith('@offline_corrupt_state_3'));
    assert.ok(backupKeys.length >= 1, 'Corrupt blob should be quarantined');
});

test('syncService: discardOfflineSale removes item from pending queue', async () => {
    const storage = new Map();
    const initialQueue = [
        { clientReferenceId: 'OFF-1', items: [], grandTotal: 100, syncStatus: 'FAILED', errorMessage: 'Stock depleted' },
        { clientReferenceId: 'OFF-2', items: [], grandTotal: 200, syncStatus: 'PENDING_SYNC' },
    ];
    storage.set('@offline_state_v2_4', JSON.stringify({
        version: 2,
        queue: initialQueue,
        history: initialQueue,
        products: [],
        customers: [],
        pendingCreditIncluded: true,
    }));

    const mockAsyncStorage = {
        getItem: async (k) => storage.get(k) ?? null,
        setItem: async (k, v) => storage.set(k, v),
        removeItem: async (k) => storage.delete(k),
    };

    const serviceMod = load('src/services/syncService.ts', {
        '@react-native-async-storage/async-storage': mockAsyncStorage,
        './api': {
            default: {},
            organizationRequestConfig: () => ({ expectedToken: 'tok' }),
            OrganizationSessionChangedError: class extends Error {},
        },
        '../utils/offlineStock': {
            deductOfflineStock: (prods) => prods,
        },
        '../utils/paymentAmounts': {
            balanceAfterPayment: () => 0,
            addCreditBalance: () => 0,
        },
    });

    const { syncService } = serviceMod;

    // Discard OFF-1
    const discarded = await syncService.discardOfflineSale(4, 'OFF-1');
    assert.equal(discarded, true);

    const remaining = await syncService.getPendingQueue(4);
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].clientReferenceId, 'OFF-2');
});
