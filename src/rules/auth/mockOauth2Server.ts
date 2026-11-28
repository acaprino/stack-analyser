import { register } from '../../register.js';

register({
  tech: 'mock-oauth2-server',
  name: 'mock-oauth2-server',
  type: 'auth',
  dependencies: [{ type: 'docker', name: 'ghcr.io/navikt/mock-oauth2-server' }],
});
