import { register } from '../../register.js';

register({
  tech: 'dodo-payments',
  name: 'Dodo Payments',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'dodopayments' },
    { type: 'python', name: 'dodopayments' },
  ],
});
