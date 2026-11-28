import { register } from '../../register.js';

register({
  tech: 'goji',
  name: 'Goji',
  type: 'framework',
  dependencies: [{ type: 'golang', name: 'github.com/zenazn/goji' }],
});
