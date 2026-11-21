import { register } from '../../register.js';

register({
  tech: 'cockroach-labs',
  name: 'Cockroach Labs',
  type: 'db',
  dependencies: [{ type: 'golang', name: 'github.com/cockroachdb/cockroach-go/v2' }],
});
