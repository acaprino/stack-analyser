import { register } from '../../register.js';

register({
  tech: 'mongoose',
  name: 'Mongoose',
  type: 'orm',
  dependencies: [{ type: 'npm', name: 'mongoose' }],
});
