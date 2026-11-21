import { register } from '../../register.js';

register({
  tech: 'pip',
  name: 'pip',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'pip' }],
});
