import { register } from '../../register.js';

register({
  tech: 'modelscope',
  name: 'ModelScope',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'modelscope' }],
});
