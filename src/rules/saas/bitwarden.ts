import { register } from '../../register.js';

register({
  tech: 'bitwarden',
  name: 'Bitwarden',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@bitwarden/sdk-napi' }],
});
