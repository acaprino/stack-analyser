import { register } from '../../register.js';

register({
  tech: 'watermelondb',
  name: 'WatermelonDB',
  type: 'tool',
  dependencies: [
    { type: 'npm', name: '@nozbe/watermelondb' },
  ],
});
