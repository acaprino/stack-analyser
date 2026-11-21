import { register } from '../../register.js';

register({
  tech: 'line',
  name: 'LINE',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@line/bot-sdk' },
    { type: 'python', name: 'line-bot-sdk' },
  ],
});
