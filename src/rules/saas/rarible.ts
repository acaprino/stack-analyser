import { register } from '../../register.js';

register({
  tech: 'rarible',
  name: 'Rarible',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@rarible/sdk' }],
});
