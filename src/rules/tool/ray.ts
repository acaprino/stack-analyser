import { register } from '../../register.js';

register({
  tech: 'ray',
  name: 'Ray',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'ray' }],
});
