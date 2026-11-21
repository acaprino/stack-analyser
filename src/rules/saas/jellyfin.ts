import { register } from '../../register.js';

register({
  tech: 'jellyfin',
  name: 'Jellyfin',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@jellyfin/sdk' }],
});
