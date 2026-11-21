import { register } from '../../register.js';

register({
  tech: 'conekta',
  name: 'Conekta',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'conekta' },
    { type: 'python', name: 'conekta' },
  ],
});
