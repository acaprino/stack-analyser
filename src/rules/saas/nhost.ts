import { register } from '../../register.js';

register({
  tech: 'nhost',
  name: 'Nhost',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@nhost/nhost-js' }],
});
