import { register } from '../../register.js';

register({
  tech: 'qase',
  name: 'Qase',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'qaseio' },
    { type: 'python', name: 'qase-api-client' },
  ],
});
