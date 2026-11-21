import { register } from '../../register.js';

register({
  tech: 'teradata',
  name: 'Teradata',
  type: 'db',
  dependencies: [{ type: 'python', name: 'teradatasql' }],
});
