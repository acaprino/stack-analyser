import { register } from '../../register.js';

register({
  tech: 'pillow',
  name: 'Pillow',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'pillow' }],
});
