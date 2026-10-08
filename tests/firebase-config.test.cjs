const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/firebase.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
function load(key) {
    const exports = {}, requests = [];
    vm.runInNewContext(compiled, { exports, process: { env: { EXPO_PUBLIC_FIREBASE_API_KEY: key } },
        require: () => ({ post: async (url, body) => { requests.push({ url, body }); return { data: { sessionInfo: 'session', idToken: 'token' } }; } }),
    });
    return { ...exports, requests };
}
test('missing Firebase configuration permits import but prevents network calls', async () => {
    for (const key of [undefined, '', '   ']) {
        const firebase = load(key);
        await assert.rejects(firebase.sendFirebasePhoneOtp('+910000000000'), /EXPO_PUBLIC_FIREBASE_API_KEY/);
        await assert.rejects(firebase.verifyFirebasePhoneOtp('session', '123456'), /EXPO_PUBLIC_FIREBASE_API_KEY/);
        assert.equal(firebase.requests.length, 0);
    }
});
test('configured public key is used while existing Firebase payloads stay unchanged', async () => {
    const firebase = load(' sample+key ');
    await firebase.sendFirebasePhoneOtp('+910000000000');
    await firebase.verifyFirebasePhoneOtp('session', '123456');
    assert.equal(firebase.requests[0].url, 'https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=sample%2Bkey');
    assert.equal(firebase.requests[0].body.phoneNumber, '+910000000000');
    assert.equal(firebase.requests[1].url, 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=sample%2Bkey');
    assert.equal(firebase.requests[1].body.sessionInfo, 'session'); assert.equal(firebase.requests[1].body.code, '123456');
});
