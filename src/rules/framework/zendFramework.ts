import { register } from '../../register.js';

register({
  tech: 'zend-framework',
  name: 'Zend Framework',
  type: 'framework',
  dependencies: [
    { type: 'php', name: 'zendframework/zend-mvc' },
    { type: 'php', name: 'zendframework/zendframework' },
  ],
});
