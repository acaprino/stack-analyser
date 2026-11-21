import { register } from '../../register.js';

register({
  tech: 'podman',
  name: 'Podman',
  type: 'tool',
  dependencies: [{ type: 'golang', name: 'github.com/containers/podman/v5' }],
});
