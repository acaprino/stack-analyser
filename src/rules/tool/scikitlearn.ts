import { register } from '../../register.js';

register({
  tech: 'scikitlearn',
  name: 'scikit-learn',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'scikit-learn' }],
});
