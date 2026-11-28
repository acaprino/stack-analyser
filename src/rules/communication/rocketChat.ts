import { register } from '../../register.js';

register({
  tech: 'rocket-chat',
  name: 'Rocket.Chat',
  type: 'communication',
  dependencies: [{ type: 'npm', name: '@rocket.chat/sdk' }],
});
