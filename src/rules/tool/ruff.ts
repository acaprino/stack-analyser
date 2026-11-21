import { register } from '../../register.js';

register({
  tech: 'ruff',
  name: 'Ruff',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'ruff' }],
});
