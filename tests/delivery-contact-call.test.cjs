const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const Renderer = require('react-test-renderer');
function load(file, mocks = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name) });
    return exports;
}
const calls = [], alerts = [];
let fail = false;
const native = { TouchableOpacity: 'Button', Text: 'Text', StyleSheet: { create: value => value },
    Alert: { alert: (...args) => alerts.push(args) },
    Linking: { openURL: async uri => { calls.push(uri); if (fail) throw Error('No handler'); } } };
const helpers = load('src/utils/phoneCall.ts', { 'react-native': native });
const { phoneUri, callSavedPhone } = helpers;
const { ContactCallButton } = load('src/features/delivery/ContactCallButton.tsx', {
    'react-native': native, 'lucide-react-native': { Phone: 'Icon' },
    '../../theme/colors': load('src/theme/colors.ts'), '../../utils/phoneCall': helpers,
});
test('saved local and international phone formatting is normalized without inventing digits', () => {
    assert.equal(phoneUri(' 98765 43210 '), 'tel:9876543210');
    assert.equal(phoneUri('+91 (98765)-43210'), 'tel:+919876543210');
});
test('missing numbers, dial codes and non-phone URLs are not dialable', () => {
    for (const value of [null, undefined, '', '  ', 9876543210, '123', '1234567890123456', '*123#', '9876543210;123', 'tel:9876543210', 'abc9876543210', '+91+9876543210'])
        assert.equal(phoneUri(value), null);
});
test('calling uses only the saved number and missing numbers never open a URL', async () => {
    calls.length = 0; alerts.length = 0;
    await callSavedPhone('98765 43210');
    assert.deepEqual(calls, ['tel:9876543210']);
    await callSavedPhone(null);
    assert.equal(calls.length, 1);
    assert.equal(alerts[0][0], 'Phone Unavailable');
});
test('dialler failure reports failure with manual dialing information', async () => {
    alerts.length = 0; fail = true;
    try { await callSavedPhone('+919876543210'); }
    finally { fail = false; }
    assert.equal(alerts[0][0], 'Could Not Open Phone');
    assert.match(alerts[0][1], /dial \+919876543210/);
    assert.doesNotMatch(alerts[0][1], /Dialing:/);
});
test('both customer and driver buttons visibly disable unavailable phone numbers', () => {
    for (const compact of [false, true]) {
        let tree;
        Renderer.act(() => { tree = Renderer.create(React.createElement(ContactCallButton, { phone: '', label: 'Call Contact', compact })); });
        try {
            const button = tree.root.findByType('Button');
            assert.equal(button.props.disabled, true);
            assert.equal(button.props.accessibilityState.disabled, true);
            assert.match(button.props.accessibilityLabel, /phone unavailable/);
            assert.equal(tree.root.findByType('Text').children.join(''), 'Phone unavailable');
        } finally { Renderer.act(() => tree.unmount()); }
    }
});
test('available call buttons invoke the saved contact number', async () => {
    calls.length = 0;
    let tree;
    Renderer.act(() => { tree = Renderer.create(React.createElement(ContactCallButton, { phone: '+91 9876543210', label: 'Call Customer' })); });
    try {
        const button = tree.root.findByType('Button');
        assert.equal(button.props.disabled, false);
        assert.equal(button.props.accessibilityLabel, 'Call Customer');
        await Renderer.act(async () => { await button.props.onPress(); });
        assert.deepEqual(calls, ['tel:+919876543210']);
    } finally { Renderer.act(() => tree.unmount()); }
});
