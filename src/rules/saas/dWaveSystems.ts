import { register } from '../../register.js';

register({
  tech: 'd-wave-systems',
  name: 'D-Wave Systems',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'dwave-ocean-sdk' }],
});
