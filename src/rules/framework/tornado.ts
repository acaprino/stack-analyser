import { register } from '../../register.js';

register({
  tech: 'tornado',
  name: 'Tornado',
  type: 'framework',
  dependencies: [{ type: 'python', name: 'tornado' }],
});
