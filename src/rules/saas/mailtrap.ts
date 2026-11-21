import { register } from '../../register.js';

register({
  tech: 'mailtrap',
  name: 'Mailtrap',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'mailtrap' },
    { type: 'python', name: 'mailtrap' },
  ],
});
