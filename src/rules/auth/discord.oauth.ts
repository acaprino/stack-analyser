import { register } from '../../register.js';

register({
  tech: 'discord.oauth',
  name: 'Discord OAuth',
  type: 'auth',
  dependencies: [{ type: 'php', name: 'socialiteproviders/discord' }],
});
