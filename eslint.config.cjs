const parser = require('@typescript-eslint/parser');
const hooks = require('eslint-plugin-react-hooks');

module.exports = [{
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': hooks },
    rules: {
        'react-hooks/rules-of-hooks': 'error',
        'eqeqeq': ['error', 'smart'],
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-dupe-else-if': 'error',
        'no-duplicate-case': 'error',
        'no-sparse-arrays': 'error',
        'no-unsafe-finally': 'error',
        'no-constant-binary-expression': 'error',
    },
}];
