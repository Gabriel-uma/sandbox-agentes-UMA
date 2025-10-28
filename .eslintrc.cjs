module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    project: undefined
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  plugins: [
    '@typescript-eslint',
    'react-refresh',
    'react-hooks'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'react-refresh/only-export-components': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/exhaustive-deps': 'off'
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'project',
    '*.config.js',
    '*.config.mjs',
    '*.config.cjs'
  ]
}
