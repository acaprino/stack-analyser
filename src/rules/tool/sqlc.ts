import { register } from '../../register.js';

register({
  tech: 'sqlc',
  name: 'sqlc',
  type: 'tool',
  dependencies: [
    { type: 'golang', name: 'github.com/sqlc-dev/sqlc' },
  ],
});
