import { register } from '../../register.js';

register({
  tech: 'alchemy',
  name: 'Alchemy',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'alchemy-sdk' }],
});
