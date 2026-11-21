import { register } from '../../register.js';

register({
  tech: 'bunq',
  name: 'bunq',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'bunq-sdk' }],
});
