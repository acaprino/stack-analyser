import { register } from '../../register.js';

register({
  tech: 'opensea',
  name: 'OpenSea',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'opensea-js' }],
});
