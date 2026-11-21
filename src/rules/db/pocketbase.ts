import { register } from '../../register.js';

register({
  tech: 'pocketbase',
  name: 'PocketBase',
  type: 'db',
  dependencies: [
    { type: 'npm', name: 'pocketbase' },
    { type: 'python', name: 'pocketbase' },
  ],
});
