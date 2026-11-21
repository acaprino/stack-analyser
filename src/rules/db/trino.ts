import { register } from '../../register.js';

register({
  tech: 'trino',
  name: 'Trino',
  type: 'db',
  dependencies: [{ type: 'python', name: 'trino' }],
});
