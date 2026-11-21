import { register } from '../../register.js';

register({
  tech: 'iota',
  name: 'IOTA',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@iota/sdk' },
    { type: 'python', name: 'iota-sdk' },
  ],
});
