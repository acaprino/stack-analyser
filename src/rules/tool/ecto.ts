import { register } from '../../register.js';

register({
  tech: 'ecto',
  name: 'Ecto',
  type: 'tool',
  dependencies: [
    { type: 'hex', name: 'ecto' },
    { type: 'hex', name: 'ecto_sql' },
  ],
});
