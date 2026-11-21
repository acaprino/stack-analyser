import { register } from '../../register.js';

register({
  tech: 'unsplash',
  name: 'Unsplash',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'unsplash-js' }],
});
