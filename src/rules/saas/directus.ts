import { register } from '../../register.js';

register({
  tech: 'directus',
  name: 'Directus',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@directus/sdk' }],
});
