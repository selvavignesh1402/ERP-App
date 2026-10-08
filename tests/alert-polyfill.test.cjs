const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name), console, ...globals });
    return exports;
}

test('Alert polyfill on web', async (t) => {
    let lastAlertMessage = null;
    let lastConfirmMessage = null;
    let confirmReturnValue = true;

    const mockAlert = {
        alert: () => {} // Default no-op from react-native-web
    };

    const mockReactNative = {
        Platform: { OS: 'web' },
        Alert: mockAlert,
    };

    const mockWindow = {
        alert: (msg) => { lastAlertMessage = msg; },
        confirm: (msg) => { lastConfirmMessage = msg; return confirmReturnValue; }
    };

    const mod = load('src/utils/alertPolyfill.ts', {
        'react-native': mockReactNative,
    }, {
        window: mockWindow,
    });

    await t.test('calls window.alert for 0 buttons', () => {
        lastAlertMessage = null;
        mockAlert.alert('Simple Alert', 'Just a message');
        assert.equal(lastAlertMessage, 'Simple Alert\n\nJust a message');
    });

    await t.test('calls window.alert and executes onPress for 1 button', () => {
        lastAlertMessage = null;
        let pressed = false;
        mockAlert.alert('Saved', 'Data was saved', [
            { text: 'OK', onPress: () => { pressed = true; } }
        ]);
        assert.equal(lastAlertMessage, 'Saved\n\nData was saved');
        assert.equal(pressed, true);
    });

    await t.test('calls window.confirm and executes confirm onPress when user accepts', () => {
        lastConfirmMessage = null;
        confirmReturnValue = true;
        let logoutPressed = false;
        let cancelPressed = false;

        mockAlert.alert('Confirm Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel', onPress: () => { cancelPressed = true; } },
            { text: 'Log Out', style: 'destructive', onPress: () => { logoutPressed = true; } }
        ]);

        assert.equal(lastConfirmMessage, 'Confirm Logout\n\nAre you sure?');
        assert.equal(logoutPressed, true);
        assert.equal(cancelPressed, false);
    });

    await t.test('calls cancel onPress when user rejects confirm', () => {
        confirmReturnValue = false;
        let logoutPressed = false;
        let cancelPressed = false;

        mockAlert.alert('Confirm Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel', onPress: () => { cancelPressed = true; } },
            { text: 'Log Out', style: 'destructive', onPress: () => { logoutPressed = true; } }
        ]);

        assert.equal(logoutPressed, false);
        assert.equal(cancelPressed, true);
    });
});
