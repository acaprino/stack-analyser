import { register } from '../../register.js';

register({
  tech: 'openldap',
  name: 'OpenLDAP',
  type: 'auth',
  dependencies: [{ type: 'docker', name: 'rroemhild/test-openldap' }],
});
