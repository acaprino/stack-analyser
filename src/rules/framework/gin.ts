import { register } from '../../register.js';

register({
  tech: 'gin',
  name: 'Gin',
  type: 'framework',
  dependencies: [
    { type: 'golang', name: 'github.com/gin-gonic/gin' },
  ],
});
