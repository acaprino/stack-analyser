import { register } from '../../register.js';

register({
  tech: 'astro-compiler',
  name: 'Astro compiler',
  type: 'builder',
  dependencies: [
    { type: 'npm', name: '@astrojs/compiler' },
  ],
});
