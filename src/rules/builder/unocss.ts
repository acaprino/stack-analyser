import { register } from '../../register.js';

register({
  tech: 'unocss',
  name: 'UnoCSS',
  type: 'builder',
  dependencies: [
    { type: 'npm', name: '@unocss/nuxt' },
    { type: 'npm', name: '@unocss/vite' },
    { type: 'npm', name: 'unocss' },
  ],
});
