import { register } from '../../register.js';

register({
  tech: 'etcd',
  name: 'etcd',
  type: 'db',
  dependencies: [{ type: 'golang', name: 'go.etcd.io/etcd/client/v3' }],
});
