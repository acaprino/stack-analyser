import { register } from '../../register.js';

register({
  tech: 'okta.oauth',
  name: 'Okta OAuth',
  type: 'auth',
  dependencies: [
    { type: 'php', name: 'socialiteproviders/okta' },
  ],
});
