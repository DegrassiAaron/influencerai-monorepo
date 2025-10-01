// Flat ESLint config for Worker (TypeScript) - CommonJS
const tsParserPkg = require('@typescript-eslint/parser');
const tsPluginPkg = require('@typescript-eslint/eslint-plugin');
const tsParser = tsParserPkg?.default ?? tsParserPkg;
const tsPlugin = tsPluginPkg?.default ?? tsPluginPkg;

module.exports = [
  {
    files: ['**/*.ts'],
    ignores: ['dist/**', 'node_modules/**', 'coverage*/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: false,
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'no-console': 'error',
    },
  },
];
