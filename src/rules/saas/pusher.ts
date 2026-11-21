import { register } from '../../register.js';

register({
  tech: 'pusher',
  name: 'Pusher',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'pusher-js' },
    { type: 'npm', name: 'pusher' },
    { type: 'python', name: 'pusher' },
    { type: 'golang', name: 'github.com/pusher/pusher-http-go/v5' },
  ],
});
