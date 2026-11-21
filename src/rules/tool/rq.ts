import { register } from '../../register.js';

register({
  tech: 'rq',
  name: 'RQ',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'rq' },
  ],
});
