import { register } from '../../register.js';

register({
  tech: 'artillery',
  name: 'Artillery',
  type: 'test',
  dependencies: [
    { type: 'npm', name: 'artillery' },
  ],
});
