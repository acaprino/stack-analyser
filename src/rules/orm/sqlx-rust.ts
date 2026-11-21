import { register } from '../../register.js';

register({
  tech: 'sqlx-rust',
  name: 'SQLx',
  type: 'orm',
  dependencies: [
    { type: 'rust', name: 'sqlx' },
  ],
});
