import { register } from '../../register.js';

register({
  tech: 'gcp.containerregistry',
  name: 'Cloud Container Registry',
  type: 'storage',
  dependencies: [{ type: 'terraform.resource', name: 'google_container_registry' }],
});
