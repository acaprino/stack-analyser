import { register } from '../../register.js';

register({
  tech: 'qlik',
  name: 'Qlik',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@qlik/api' }],
});
