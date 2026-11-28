import { register } from '../../register.js';

register({
  tech: 'iris',
  name: 'Iris',
  type: 'framework',
  dependencies: [{ type: 'golang', name: 'github.com/kataras/iris' }],
});
