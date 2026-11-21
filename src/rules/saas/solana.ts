import { register } from '../../register.js';

register({
  tech: 'solana',
  name: 'Solana',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@solana/web3.js' }],
});
