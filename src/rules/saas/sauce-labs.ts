import { register } from '../../register.js';

register({
  tech: 'sauce-labs',
  name: 'Sauce Labs',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'saucelabs' }],
});
