import { register } from '../../register.js';

register({
  tech: 'keycloak',
  name: 'Keycloak',
  type: 'auth',
  dependencies: [
    { type: 'python', name: 'python-keycloak' },
    { type: 'npm', name: 'keycloak-js' },
    { type: 'docker', name: 'quay.io/keycloak/keycloak' },
  ],
});
