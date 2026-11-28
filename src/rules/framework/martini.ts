import { register } from '../../register.js';

register({
  tech: 'martini',
  name: 'Martini',
  type: 'framework',
  dependencies: [{ type: 'golang', name: 'github.com/go-martini/martini' }],
});
