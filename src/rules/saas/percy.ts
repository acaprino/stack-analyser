import { register } from '../../register.js';

register({
  tech: 'percy',
  name: 'Percy',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@percy/cli' }],
});
