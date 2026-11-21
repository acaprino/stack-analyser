import { register } from '../../register.js';

register({
  tech: 'giphy',
  name: 'GIPHY',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@giphy/js-fetch-api' }],
});
