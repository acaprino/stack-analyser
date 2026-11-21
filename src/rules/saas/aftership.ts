import { register } from '../../register.js';

register({
  tech: 'aftership',
  name: 'AfterShip',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'aftership' },
    { type: 'python', name: 'aftership' },
  ],
});
