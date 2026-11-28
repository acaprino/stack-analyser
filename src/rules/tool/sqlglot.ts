import { register } from '../../register.js';

register({
  tech: 'sqlglot',
  name: 'SQLGlot',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'sqlglot' }],
});
