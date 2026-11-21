import { register } from '../../register.js';

register({
  tech: 'apicurio-registry',
  name: 'Apicurio Registry',
  type: 'queue',
  dependencies: [
    { type: 'docker', name: 'quay.io/apicurio/apicurio-registry' },
  ],
});
