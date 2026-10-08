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
    vm.runInNewContext(code, { exports, Error, require: name => mocks[name] ?? require(name) });
    return exports;
}
const colors = load('src/theme/colors.ts');
const sharing = load('src/features/delivery/deliverySharing.ts', {
    './tripDetails': load('src/features/delivery/tripDetails.ts'),
    './tripStatus': load('src/features/delivery/tripStatus.ts', { '../../theme/colors': colors }),
});
const delivery = { deliveryNumber: 'DN-5', status: 'PARTIALLY_DELIVERED', customer: { customerName: 'Shop', address: 'Main Street', phone: 'private' }, deliveryNotes: 'Internal notes', items: [{ product: { productName: 'Rice' }, deliveringQuantity: 10, deliveredQuantity: 4 }] };
test('shared summary distinguishes dispatched and received quantities without billing guesses', () => {
    const text = sharing.deliverySummary(delivery);
    assert.match(text, /Delivery: DN-5/);
    assert.match(text, /Partially Delivered/);
    assert.match(text, /dispatched 10 bags; received 4 bags/);
    assert.doesNotMatch(text, /private|Internal notes|720|1440/);
});
test('sharing preserves zero received and omits received counts before confirmation', () => {
    const zero = { ...delivery, items: [{ ...delivery.items[0], deliveredQuantity: 0 }] };
    assert.match(sharing.deliverySummary(zero), /received 0 bags/);
    assert.doesNotMatch(sharing.deliverySummary({ ...zero, status: 'ASSIGNED' }), /received/);
});
test('missing delivery identity cannot be shared and other missing data stay unavailable', () => {
    assert.throws(() => sharing.deliverySummary({}), /Delivery number is unavailable/);
    const text = sharing.deliverySummary({ deliveryNumber: 'DN-6' });
    assert.match(text, /Address unavailable/);
    assert.match(text, /Delivery items unavailable/);
});
const calls = []; let rejection;
const { DeliveryShareButton } = load('src/features/delivery/DeliveryShareButton.tsx', {
    'react-native': { Modal: 'Modal', View: 'View', Text: 'Text', TouchableOpacity: 'Button', ScrollView: 'Scroll', StyleSheet: { create: value => value }, Share: { share: async payload => { calls.push(payload); if (rejection) throw rejection; return { action: 'dismissedAction' }; } } },
    'lucide-react-native': { Share2: 'Icon' }, '../../theme/colors': colors, './deliverySharing': sharing,
});
function mount(value = delivery) {
    let tree;
    Renderer.act(() => { tree = Renderer.create(React.createElement(DeliveryShareButton, { delivery: value })); });
    return tree;
}
const button = (tree, label) => tree.root.findAllByType('Button').find(node => node.props.accessibilityLabel === label);
const renderedText = tree => tree.root.findAllByType('Text').map(node => node.children.join('')).join('\n');
test('sharing requires preview then user action and passes the real summary to the share sheet', async () => {
    calls.length = 0; const tree = mount();
    try {
        Renderer.act(() => button(tree, 'Preview delivery summary').props.onPress());
        assert.equal(tree.root.findByType('Modal').props.visible, true);
        assert.equal(calls.length, 0);
        assert.equal(tree.root.findAllByType('Text').some(node => node.props.selectable), true);
        await Renderer.act(async () => { await button(tree, 'Open share options').props.onPress(); });
        assert.equal(calls[0].message, sharing.deliverySummary(delivery));
        assert.doesNotMatch(renderedText(tree), /successfully shared/i);
        Renderer.act(() => button(tree, 'Close delivery summary').props.onPress());
        assert.equal(tree.root.findByType('Modal').props.visible, false);
    } finally { Renderer.act(() => tree.unmount()); }
});
test('unsupported sharing keeps a copyable preview and reports the failure', async () => {
    rejection = Error('Unsupported'); const tree = mount();
    try {
        Renderer.act(() => button(tree, 'Preview delivery summary').props.onPress());
        await Renderer.act(async () => { await button(tree, 'Open share options').props.onPress(); });
        assert.match(renderedText(tree), /select and copy/);
        assert.match(renderedText(tree), /DN-5/);
    } finally { rejection = undefined; Renderer.act(() => tree.unmount()); }
});
test('cancelled browser share is silent and missing identity disables sharing', async () => {
    rejection = { name: 'AbortError' }; const tree = mount();
    try {
        Renderer.act(() => button(tree, 'Preview delivery summary').props.onPress());
        await Renderer.act(async () => { await button(tree, 'Open share options').props.onPress(); });
        assert.doesNotMatch(renderedText(tree), /Could not open/);
    } finally { rejection = undefined; Renderer.act(() => tree.unmount()); }
    const missing = mount({});
    try {
        Renderer.act(() => button(missing, 'Preview delivery summary').props.onPress());
        assert.equal(button(missing, 'Open share options').props.disabled, true);
        assert.match(renderedText(missing), /Delivery number is unavailable/);
    } finally { Renderer.act(() => missing.unmount()); }
});
