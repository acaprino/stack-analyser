import { register } from '../../register.js';

register({
  tech: 'numpy',
  name: 'NumPy',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'numpy' }],
});
