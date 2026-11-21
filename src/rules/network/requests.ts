import { register } from '../../register.js';

register({
  tech: 'requests',
  name: 'Requests',
  type: 'network',
  dependencies: [{ type: 'python', name: 'requests' }],
});
