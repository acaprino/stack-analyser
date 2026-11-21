import { register } from '../../register.js';

register({
  tech: 'microstrategy',
  name: 'MicroStrategy',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'mstrio-py' }],
});
