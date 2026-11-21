import { register } from '../../register.js';

register({
  tech: 'passport',
  name: 'Passport',
  type: 'auth',
  dependencies: [
    { type: 'npm', name: 'passport' },
  ],
});
