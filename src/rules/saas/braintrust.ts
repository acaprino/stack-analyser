import { register } from '../../register.js';

register({
  tech: 'braintrust',
  name: 'Braintrust',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'braintrust' },
    { type: 'python', name: 'braintrust' },
  ],
});
