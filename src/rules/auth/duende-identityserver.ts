import { register } from '../../register.js';

register({
  tech: 'duende-identityserver',
  name: 'Duende IdentityServer',
  type: 'auth',
  dependencies: [
    { type: 'nuget', name: /^Duende\.IdentityServer(?:\.|$)/i, example: 'Duende.IdentityServer' },
  ],
});
