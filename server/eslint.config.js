import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'prisma/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['src/tests/**/*.js', 'vitest.config.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'uploads/', 'prisma/migrations/'],
  },
];
