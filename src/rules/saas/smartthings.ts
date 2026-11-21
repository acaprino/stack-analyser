import { register } from '../../register.js';

register({
  tech: 'smartthings',
  name: 'SmartThings',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@smartthings/core-sdk' }],
});
