// Flat ESLint config for NestJS (TypeScript) - CommonJS
const tsParserPkg = require('@typescript-eslint/parser');
const tsPluginPkg = require('@typescript-eslint/eslint-plugin');
const tsParser = tsParserPkg?.default ?? tsParserPkg;
const tsPlugin = tsPluginPkg?.default ?? tsPluginPkg;

module.exports = [
  // Base config for all TS files
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
    },
  },
  // Enforce no-explicit-any in src
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // Allow any in tests
  {
    files: ['test/**/*.ts', '**/*.spec.ts', '**/*.e2e-spec.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
