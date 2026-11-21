import { register } from '../../register.js';

register({
  tech: 'tailwind',
  name: 'Tailwind',
  type: 'ui',
  files: ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts'],
  dependencies: [
    { type: 'npm', name: 'tailwindcss' },
    { type: 'npm', name: '@tailwindcss/vite' },
    { type: 'hex', name: 'tailwind' },
  ],
});
