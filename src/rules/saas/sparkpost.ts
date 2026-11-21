import { register } from '../../register.js';

register({
  tech: 'sparkpost',
  name: 'SparkPost',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'sparkpost' },
    { type: 'python', name: 'sparkpost' },
  ],
});
