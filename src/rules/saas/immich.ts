import { register } from '../../register.js';

register({
  tech: 'immich',
  name: 'Immich',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@immich/sdk' }],
});
