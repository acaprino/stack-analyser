import { register } from '../../register.js';

register({
  tech: 'roboflow',
  name: 'Roboflow',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'roboflow' }],
});
