import { register } from '../../register.js';

register({
  tech: 'backblaze',
  name: 'Backblaze',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'backblaze-b2' }],
});
