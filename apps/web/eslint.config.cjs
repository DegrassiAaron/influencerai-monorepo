// Flat ESLint config for the Next.js app (ESLint v9, CommonJS)
const js = require('@eslint/js')
const { FlatCompat } = require('@eslint/eslintrc')

// Convert eslintrc-style configs (like eslint-config-next) to flat configs
const compat = new FlatCompat({ baseDirectory: __dirname })
const nextCoreWebVitals = compat.extends('next/core-web-vitals')

module.exports = [
  { ignores: ['.next/**', 'node_modules/**', 'dist/**'] },
  js.configs.recommended,
  ...nextCoreWebVitals,
]
