import { register } from '../../register.js';

register({
  tech: 'keras',
  name: 'Keras',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'keras' }],
});
