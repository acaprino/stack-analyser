import { register } from '../../register.js';

register({
  tech: 'sqlx-go',
  name: 'sqlx',
  type: 'orm',
  dependencies: [
    { type: 'golang', name: 'github.com/jmoiron/sqlx' },
  ],
});
