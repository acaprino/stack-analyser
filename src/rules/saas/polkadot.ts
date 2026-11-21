import { register } from '../../register.js';

register({
  tech: 'polkadot',
  name: 'Polkadot',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@polkadot/api' }],
});
