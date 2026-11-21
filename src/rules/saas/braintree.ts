import { register } from '../../register.js';

register({
  tech: 'braintree',
  name: 'Braintree',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'braintree' }],
});
