import { register } from '../../register.js';

register({
  tech: 'camunda',
  name: 'Camunda',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@camunda8/sdk' }],
});
