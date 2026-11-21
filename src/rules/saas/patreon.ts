import { register } from '../../register.js';

register({
  tech: 'patreon',
  name: 'Patreon',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'patreon' },
    { type: 'python', name: 'patreon' },
  ],
});
