import { register } from '../../register.js';

register({
  tech: 'app-store',
  name: 'App Store',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@apple/app-store-server-library' }],
});
