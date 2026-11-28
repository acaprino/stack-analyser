import { register } from '../../register.js';

register({
  tech: 'locust',
  name: 'Locust',
  type: 'test',
  dependencies: [{ type: 'python', name: 'locust' }],
});
