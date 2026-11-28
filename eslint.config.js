import lint from '@h1fra/eslint-config';

export default [
  {
    // *.generated.ts is written by `npm run prebuild` and not committed.
    ignores: ['**/dist/', '**/node_modules/', '**/.wrangler', '**/*.generated.ts'],
  },
  ...lint.configs.base,
  ...lint.configs.strict,
  {
    settings: {},
    rules: {
      'import-x/extensions': 'off', // does not work for some reason
      'import-x/no-extraneous-dependencies': 'off', // does not work for some reason
    },
  },
  {
    files: ['**/**.test.ts'],
    rules: {
      // Vitest takes a message as the second argument of expect(): it says which entry failed.
      'vitest/valid-expect': ['error', { maxArgs: 2 }],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];
