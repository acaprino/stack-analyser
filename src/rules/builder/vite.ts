import { register } from '../../register.js';

register({
  tech: 'vite',
  name: 'Vite',
  type: 'builder',
  dependencies: [{ type: 'npm', name: 'vite' }],
  files: [
    'vite.config.cjs',
    'vite.config.cts',
    'vite.config.js',
    'vite.config.mjs',
    'vite.config.mts',
    'vite.config.ts',
  ],
});
