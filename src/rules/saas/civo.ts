import { register } from '../../register.js';

register({
  tech: 'civo',
  name: 'Civo',
  type: 'saas',
  dependencies: [{ type: 'golang', name: 'github.com/civo/civogo' }],
});
