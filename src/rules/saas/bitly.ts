import { register } from '../../register.js';

register({
  tech: 'bitly',
  name: 'Bitly',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'bitly' }],
});
