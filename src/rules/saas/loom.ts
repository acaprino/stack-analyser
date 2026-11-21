import { register } from '../../register.js';

register({
  tech: 'loom',
  name: 'Loom',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@loomhq/record-sdk' }],
});
