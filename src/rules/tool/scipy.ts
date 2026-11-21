import { register } from '../../register.js';

register({
  tech: 'scipy',
  name: 'SciPy',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'scipy' }],
});
