import { register } from '../../register.js';

register({
  tech: 'algorand',
  name: 'Algorand',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'algosdk' },
    { type: 'python', name: 'py-algorand-sdk' },
    { type: 'golang', name: 'github.com/algorand/go-algorand-sdk/v2' },
  ],
});
