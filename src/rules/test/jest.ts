import { register } from '../../register.js';

register({
  tech: 'jest',
  name: 'Jest',
  type: 'test',
  files: [
    'jest.config.cjs',
    'jest.config.cts',
    'jest.config.js',
    'jest.config.json',
    'jest.config.mjs',
    'jest.config.ts',
  ],
  dependencies: [
    { type: 'npm', name: 'jest' },
    { type: 'npm', name: 'babel-jest' },
    { type: 'npm', name: 'jest-cli' },
  ],
});
