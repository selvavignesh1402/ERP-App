const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadWithoutAtob(file, mocks = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    // Explicitly do NOT provide atob in global context (simulating React Native Hermes)
    vm.runInNewContext(code, {
        exports,
        require: (name) => mocks[name] ?? require(name),
        atob: undefined,
        Date,
        JSON,
        Math,
        Number,
        String,
        Promise,
    });
    return exports;
}

const token = (exp) => 'header.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.signature';

test('Hermes environment without atob global: restoreOfflineSession successfully parses JWT and restores session', async () => {
    const data = new Map();
    const session = loadWithoutAtob('src/services/offlineSession.ts', {
        'react-native': { Platform: { OS: 'android' } },
        'expo-secure-store': {
            getItemAsync: async (k) => data.get(k),
            setItemAsync: async (k, v) => data.set(k, v),
            deleteItemAsync: async (k) => data.delete(k),
        },
    });

    const currentToken = token(Date.now() / 1000 + 3600);
    const profile = { id: 10, organizationId: 5, name: 'Field Agent' };

    await session.saveOfflineSession(currentToken, profile);
    const restored = await session.restoreOfflineSession(currentToken);

    assert.ok(restored, 'Session must be restored even when atob is undefined');
    assert.equal(restored.id, 10);
    assert.equal(restored.organizationId, 5);
    assert.equal(restored.name, 'Field Agent');

    // Expired token must return null
    const expiredToken = token(Date.now() / 1000 - 100);
    await session.saveOfflineSession(expiredToken, profile);
    assert.equal(await session.restoreOfflineSession(expiredToken), null);

    // Malformed token must return null without crashing
    assert.equal(await session.restoreOfflineSession('invalid'), null);
});
