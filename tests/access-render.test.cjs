const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const Renderer = require('react-test-renderer');
const { act } = Renderer;

function load(file, mocks) {
    const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
            jsx: ts.JsxEmit.React, esModuleInterop: true },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, require: name => mocks[name] ?? require(name) });
    return exports;
}
const native = { View: 'View', Text: 'Text', ActivityIndicator: 'Spinner', StyleSheet: { create: v => v } };

for (const [name, state, props, visible] of [
    ['loading', { ready: false }, {}, false],
    ['failed identity', { ready: true, failed: true }, {}, false],
    ['missing permission', { ready: true }, { permission: 'sale:view' }, false],
    ['wrong platform role', { ready: true }, { role: 'MASTER_ADMIN' }, false],
    ['all ledger permissions required', { ready: true, allowed: ['payment:view', 'sale:view'] },
        { permissions: ['payment:view', 'sale:view', 'customer:view'] }, false],
    ['authorized', { ready: true, allowed: ['sale:view'] }, { permission: 'sale:view' }, true],
]) test(`RoleGate renders ${name} without mounting unauthorized content`, () => {
    let mounts = 0;
    const { RoleGate } = load('src/components/RoleGate.tsx', {
        'react-native': native,
        '../hooks/usePermission': { usePermission: () => ({ ...state,
            can: p => state.allowed?.includes(p), hasRole: () => false }) },
        './AccessDeniedScreen': { AccessDeniedScreen: () => React.createElement('Denied') },
        '../theme/colors': { Colors: {} },
    });
    function PrivateScreen() { React.useEffect(() => { mounts++; }, []); return React.createElement('Private'); }
    let tree;
    act(() => { tree = Renderer.create(React.createElement(RoleGate, props, React.createElement(PrivateScreen))); });
    assert.equal(tree.root.findAllByType('Private').length, visible ? 1 : 0);
    assert.equal(mounts, visible ? 1 : 0);
    act(() => tree.unmount());
});

test('shop and user changes remount child state and bind a fresh API client', () => {
    let current = { orgId: 1, userId: 5, ready: true, failed: false };
    let mounts = 0, unmounts = 0;
    const { OrgScopedScreen } = load('src/components/OrgScopedScreen.tsx', {
        'react-native': native,
        '../contexts/RoleContext': { useRoleContext: () => current },
        '../services/api': { forOrganization: orgId => ({ orgId }) },
        '../theme/colors': { Colors: {} },
    });
    function Child({ api }) {
        const [initial] = React.useState(api.orgId);
        React.useEffect(() => { mounts++; return () => { unmounts++; }; }, []);
        return React.createElement('Session', { initial, organization: api.orgId });
    }
    const screen = () => React.createElement(OrgScopedScreen, null, api => React.createElement(Child, { api }));
    let tree;
    act(() => { tree = Renderer.create(screen()); });
    current = { ...current, orgId: 2 };
    act(() => tree.update(screen()));
    assert.equal(tree.root.findByType('Session').props.initial, 2);
    current = { ...current, userId: 6 };
    act(() => tree.update(screen()));
    assert.equal(mounts, 3); assert.equal(unmounts, 2);
    current = { ...current, orgId: null };
    act(() => tree.update(screen()));
    assert.equal(tree.root.findAllByType('Session').length, 0);
    assert.equal(unmounts, 3);
    act(() => tree.unmount());
});
