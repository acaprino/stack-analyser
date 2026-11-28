import { register } from '../../register.js';

register({
  tech: 'pluggy',
  name: 'Pluggy',
  type: 'payment',
  dependencies: [{ type: 'npm', name: 'pluggy-sdk' }],
});
