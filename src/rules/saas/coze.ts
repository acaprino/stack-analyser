import { register } from '../../register.js';

register({
  tech: 'coze',
  name: 'Coze',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@coze/api' }],
});
