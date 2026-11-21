import { register } from '../../register.js';

register({
  tech: 'coinbase',
  name: 'Coinbase',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@coinbase/coinbase-sdk' }],
});
