import { register } from '../../register.js';

register({
  tech: 'jitsi',
  name: 'Jitsi',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@jitsi/react-sdk' }],
});
