import { register } from '../../register.js';

register({
  tech: 'kaggle',
  name: 'Kaggle',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'kaggle' }],
});
