import { register } from '../../register.js';

register({
  tech: 'foundationdb',
  name: 'FoundationDB',
  type: 'db',
  dependencies: [{ type: 'python', name: 'foundationdb' }],
});
