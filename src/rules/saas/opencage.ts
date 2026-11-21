import { register } from '../../register.js';

register({
  tech: 'opencage',
  name: 'OpenCage',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'opencage' }],
});
