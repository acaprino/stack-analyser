import { register } from '../../register.js';

register({
  tech: 'pusher',
  name: 'Pusher',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'pusher-js' },
  ],
});
