import { register } from '../../register.js';

register({
  tech: 'maptiler',
  name: 'MapTiler',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@maptiler/sdk' }],
});
