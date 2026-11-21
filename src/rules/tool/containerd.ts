import { register } from '../../register.js';

register({
  tech: 'containerd',
  name: 'containerd',
  type: 'tool',
  dependencies: [{ type: 'golang', name: 'github.com/containerd/containerd' }],
});
