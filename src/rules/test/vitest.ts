import { register } from '../../register.js';

register({
  tech: 'vitest',
  name: 'Vitest',
  type: 'test',
  files: [
    'vitest.config.js',
    'vitest.config.ts',
    'vitest.config.cjs',
    'vitest.config.cts',
    'vitest.config.mjs',
    'vitest.config.mts',
  ],
  dependencies: [{ type: 'npm', name: 'vitest' }],
});
