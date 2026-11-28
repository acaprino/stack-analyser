import { register } from '../../register.js';

register({
  tech: 'fiber',
  name: 'Fiber',
  type: 'framework',
  dependencies: [{ type: 'golang', name: 'github.com/gofiber/fiber' }],
});
