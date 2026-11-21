import { register } from '../../register.js';

register({
  tech: 'looker',
  name: 'Looker',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@looker/sdk' }],
});
