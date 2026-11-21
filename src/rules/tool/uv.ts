import { register } from '../../register.js';

register({
  tech: 'uv',
  name: 'uv',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'uv' }],
});
