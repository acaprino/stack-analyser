import { register } from '../../register.js';

register({
  tech: 'deepgram',
  name: 'Deepgram',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@deepgram/sdk' },
    { type: 'python', name: 'deepgram-sdk' },
  ],
});
