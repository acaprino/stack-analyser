import { register } from '../../register.js';

register({
  tech: 'pandas',
  name: 'pandas',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'pandas' }],
});
