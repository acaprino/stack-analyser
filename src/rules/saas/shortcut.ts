import { register } from '../../register.js';

register({
  tech: 'shortcut',
  name: 'Shortcut',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@useshortcut/client' }],
});
