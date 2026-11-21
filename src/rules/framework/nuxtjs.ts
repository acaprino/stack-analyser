import { register } from '../../register.js';

register({
  tech: 'nuxtjs',
  name: 'Nuxt.js',
  type: 'framework',
  files: ['nuxt.config.js', 'nuxt.config.mjs', 'nuxt.config.ts'],
  dependencies: [
    { type: 'npm', name: 'nuxt' },
    { type: 'npm', name: 'nuxt-edge' },
    { type: 'npm', name: 'nuxt3' },
  ],
});
