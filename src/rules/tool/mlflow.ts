import { register } from '../../register.js';

register({
  tech: 'mlflow',
  name: 'Mlflow',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'mlflow' }],
});
