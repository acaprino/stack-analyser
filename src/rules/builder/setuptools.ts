import { register } from '../../register.js';

register({
  tech: 'setuptools',
  name: 'setuptools',
  type: 'builder',
  dependencies: [{ type: 'python', name: 'setuptools' }],
});
