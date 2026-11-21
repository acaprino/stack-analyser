import { register } from '../../register.js';

register({
  tech: 'keyring',
  name: 'keyring',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'keyring' },
  ],
});
