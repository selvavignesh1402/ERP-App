const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
function load({ platform = 'web', development = false, configured, constants = {} } = {}) {
    const exports = {};
    const mocks = { axios, 'react-native': { Platform: { OS: platform } },
        'expo-secure-store': { getItemAsync: async () => null }, 'expo-constants': constants };
    vm.runInNewContext(compiled, {
        exports, require: name => mocks[name], URL, __DEV__: development,
        process: { env: { EXPO_PUBLIC_API_URL: configured } }, console,
    });
    return exports.default;
}
for (const platform of ['web', 'android', 'ios']) {
    for (const development of [false, true]) {
        test(`${platform} ${development ? 'development' : 'production'} honors the configured URL over Expo metadata`, async () => {
            const constants = { expoConfig: { hostUri: '192.168.1.5:8081' } };
            const api = load({ platform, development, configured: ' https://backend.example/api/ ', constants });
            assert.equal(api.defaults.baseURL, 'https://backend.example/api');
            constants.expoConfig.hostUri = '192.168.1.99:8081';
            api.defaults.adapter = async config => {
                assert.equal(config.baseURL, 'https://backend.example/api');
                return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
            };
            await api.get('/products');
        });
    }
    test(`${platform} production refuses missing configuration even with Expo metadata`, () => {
        for (const configured of [undefined, '']) {
            assert.throws(() => load({ platform, configured, constants: { expoConfig: { hostUri: '192.168.1.5:8081' } } }),
                /EXPO_PUBLIC_API_URL is required/);
        }
    });
}
for (const configured of ['   ', '/api', 'backend.example', 'ftp://backend.example', 'https://',
    'https://user:secret@backend.example', 'https://backend.example?token=value', 'https://backend.example/#part',
    'http://bad host:8083', 'http://backend.example:99999']) {
    test(`invalid configured URL is rejected without falling back: ${configured}`, () => {
        assert.throws(() => load({ configured, development: true }), /Invalid EXPO_PUBLIC_API_URL/);
    });
}
test('development web keeps its local default', () => {
    assert.equal(load({ development: true }).defaults.baseURL, 'http://127.0.0.1:8083');
});
test('native development discovers a LAN host and replaces the Metro port', () => {
    for (const hostUri of ['192.168.1.5:8081', 'exp://192.168.1.5:8081/--/login']) {
        assert.equal(load({ platform: 'android', development: true, constants: { expoConfig: { hostUri } } }).defaults.baseURL,
            'http://192.168.1.5:8083');
    }
});

test('business calls use canonical API paths without changing identity routes or double-prefixing', async () => {
    const api = load({ development: true });
    for (const [requested, expected] of [
        ['/products', '/api/products'], ['/sales/12/items', '/api/sales/12/items'],
        ['/inventory/adjustments?productId=12', '/api/stock-adjustments?productId=12'],
        ['/api/sales-orders', '/api/sales-orders'], ['/profile', '/profile'],
        ['/auth/me', '/auth/me'],
    ]) {
        api.defaults.adapter = async config => {
            assert.equal(config.url, expected);
            return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
        };
        await api.get(requested);
    }
});
test('native development preserves IPv6 brackets', () => {
    assert.equal(load({ platform: 'ios', development: true, constants: { expoConfig: { hostUri: '[fd00::123]:8081' } } }).defaults.baseURL,
        'http://[fd00::123]:8083');
});
test('missing, invalid and loopback Metro hosts use development platform defaults', () => {
    for (const hostUri of [undefined, 'not a URL', 'localhost:8081', '127.0.0.1:8081', '[::1]:8081']) {
        assert.equal(load({ platform: 'android', development: true, constants: { expoConfig: { hostUri } } }).defaults.baseURL,
            'http://10.0.2.2:8083');
        assert.equal(load({ platform: 'ios', development: true, constants: { expoConfig: { hostUri } } }).defaults.baseURL,
            'http://127.0.0.1:8083');
    }
});
