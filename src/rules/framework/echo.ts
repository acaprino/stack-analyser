import { register } from '../../register.js';

register({
  tech: 'echo',
  name: 'Echo',
  type: 'framework',
  dependencies: [{ type: 'golang', name: 'github.com/labstack/echo/v4' }],
});
