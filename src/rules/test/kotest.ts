import { register } from '../../register.js';

register({
  tech: 'kotest',
  name: 'Kotest',
  type: 'test',
  dependencies: [{ type: 'maven', name: 'io.kotest:kotest-assertions-table' }],
});
