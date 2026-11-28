import { register } from '../../register.js';

register({
  tech: 'marshmallow',
  name: 'marshmallow',
  type: 'validation',
  dependencies: [{ type: 'python', name: 'marshmallow' }],
});
