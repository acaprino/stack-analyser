import { register } from '../../register.js';

register({
  tech: 'poe',
  name: 'Poe',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'fastapi-poe' }],
});
