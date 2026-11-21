import { register } from '../../register.js';

register({
  tech: 'magic',
  name: 'Magic',
  type: 'auth',
  dependencies: [{ type: 'npm', name: 'magic-sdk' }],
});
