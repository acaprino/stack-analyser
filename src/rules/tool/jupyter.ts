import { register } from '../../register.js';

register({
  tech: 'jupyter',
  name: 'Jupyter',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'jupyter' }],
});
