import { register } from '../../register.js';

register({
  tech: 'twitch.oauth',
  name: 'Twitch OAuth',
  type: 'auth',
  dependencies: [
    { type: 'php', name: 'socialiteproviders/twitch' },
  ],
});
