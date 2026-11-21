import { register } from '../../register.js';

register({
  tech: 'firepit',
  name: 'Firepit',
  type: 'saas',
  dependencies: [
    { type: 'docker', name: 'ghcr.io/florianl/firepit' },
  ],
});
