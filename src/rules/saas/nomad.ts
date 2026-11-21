import { register } from '../../register.js';

register({
  tech: 'nomad',
  name: 'Nomad',
  type: 'saas',
  dependencies: [{ type: 'golang', name: 'github.com/hashicorp/nomad/api' }],
});
