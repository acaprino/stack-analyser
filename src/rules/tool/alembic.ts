import { register } from '../../register.js';

register({
  tech: 'alembic',
  name: 'Alembic',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'alembic' }],
});
