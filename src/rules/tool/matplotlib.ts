import { register } from '../../register.js';

register({
  tech: 'matplotlib',
  name: 'Matplotlib',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'matplotlib' }],
});
