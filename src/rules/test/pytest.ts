import { register } from '../../register.js';

register({
  tech: 'pytest',
  name: 'pytest',
  type: 'test',
  dependencies: [{ type: 'python', name: 'pytest' }],
});
