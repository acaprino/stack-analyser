import { register } from '../../register.js';

register({
  tech: 'gotenberg',
  name: 'Gotenberg',
  type: 'saas',
  dependencies: [
    { type: 'docker', name: 'gotenberg/gotenberg' },
    { type: 'python', name: 'gotenberg-client' },
  ],
});
