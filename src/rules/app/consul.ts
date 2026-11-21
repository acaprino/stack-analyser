import { register } from '../../register.js';

register({
  tech: 'consul',
  name: 'Consul',
  type: 'app',
  dependencies: [
    { type: 'docker', name: 'consul' },
    { type: 'golang', name: 'github.com/hashicorp/consul/api' },
  ],
});
