import { register } from '../../register.js';

register({
  tech: 'casbin',
  name: 'Casbin',
  type: 'tool',
  dependencies: [
    { type: 'golang', name: 'github.com/casbin/casbin' },
  ],
});
