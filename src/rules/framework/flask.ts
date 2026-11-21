import { register } from '../../register.js';

register({
  tech: 'flask',
  name: 'Flask',
  type: 'framework',
  dependencies: [
    { type: 'python', name: 'flask' },
  ],
});
