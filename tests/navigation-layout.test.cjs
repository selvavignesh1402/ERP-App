const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function load(file, exported, mocks) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8') + `\nexport { ${exported} };`;
    const compiled = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React,
    } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, React, require: name => mocks[name] || require(name) });
    return exports[exported];
}
function elements(element) {
    if (!element || typeof element !== 'object') return [];
    return [element, ...React.Children.toArray(element.props?.children).flatMap(elements)];
}
test('dock keeps hook order across desktop breakpoint, native widths and role changes', () => {
    let width = 1023; const platform = { OS: 'web' }; let calls = [];
    const pushed = [], navigated = [];
    const Dock = load('app/(tabs)/_layout.tsx', 'CustomBottomDock', {
        'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button', Platform: platform,
            StyleSheet: { create: x => x }, useWindowDimensions: () => { calls.push('dimensions'); return { width }; } },
        'expo-router': { useRouter: () => { calls.push('router'); return { push: p => pushed.push(p) }; } },
        'lucide-react-native': new Proxy({}, { get: (_, key) => String(key) }),
        '../../src/services/api': {}, '../../src/hooks/useCurrentRole': {}, '../../src/theme/colors': { Colors: {} },
    });
    for (const [os, nextWidth, role, hidden] of [
        ['web', 1023, 'ADMIN', false], ['web', 1024, 'ADMIN', true], ['web', 1400, 'SALES', true],
        ['web', 600, 'SALES', false], ['ios', 1400, 'WAREHOUSE', false], ['android', 1400, 'ACCOUNTANT', false],
    ]) {
        platform.OS = os; width = nextWidth; calls = [];
        const output = Dock({ state: { routes: [{ name: 'index' }], index: 0 }, navigation: { navigate: p => navigated.push(p) }, role });
        assert.deepEqual(calls, ['dimensions', 'router']); assert.equal(output === null, hidden);
        if (!hidden) {
            const buttons = elements(output).filter(e => e.type === 'Button'); assert.equal(buttons.length, 5);
            buttons[0].props.onPress(); buttons[2].props.onPress();
            assert.equal(navigated.at(-1), 'index'); assert.equal(pushed.at(-1), '/(tabs)/menu');
            buttons[1].props.onPress(); buttons[3].props.onPress();
            if (role === 'SALES') assert.ok(pushed.includes('/field-sales'));
            if (role === 'WAREHOUSE') assert.equal(pushed.at(-1), '/purchases');
            if (role === 'ACCOUNTANT') { assert.equal(navigated.at(-1), 'ledger'); assert.equal(pushed.at(-1), '/invoices'); }
        }
    }
});
test('desktop auth pages exclude the business sidebar, including signup', () => {
    let pathname = '/signup'; let width = 1200;
    const Layout = load('app/_layout.tsx', 'AppLayoutContent', {
        'expo-router': { Stack: 'Stack', usePathname: () => pathname },
        'react-native': { View: 'View', Platform: { OS: 'web' }, StyleSheet: { create: x => x }, useWindowDimensions: () => ({ width }) },
        '@expo-google-fonts/urbanist': {}, 'expo-splash-screen': { preventAutoHideAsync: async () => {} },
        '../src/theme/colors': { Colors: {} }, '../src/contexts/RoleContext': {},
        '../src/components/DesktopSidebar': { DesktopSidebar: 'Sidebar' },
        '../src/utils/alertPolyfill': {},
        'react-native-safe-area-context': { SafeAreaProvider: ({ children }) => children },
    });
    for (const route of ['/welcome', '/login', '/signup', '/invite']) {
        pathname = route; const tree = elements(Layout());
        assert.equal(tree.filter(e => e.type === 'Sidebar').length, 0);
        assert.equal(tree.filter(e => e.type === 'Stack').length, 1);
        assert.ok(tree.some(e => e.props.style?.maxWidth === 480));
    }
    pathname = '/sales'; assert.equal(elements(Layout()).filter(e => e.type === 'Sidebar').length, 1);
    width = 1023; assert.equal(elements(Layout()).filter(e => e.type === 'Sidebar').length, 0);
});
