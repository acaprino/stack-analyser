import { register } from '../../register.js';

register({
  tech: 'vonage',
  name: 'Vonage',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@vonage/server-sdk' },
    { type: 'python', name: 'vonage' },
  ],
});
