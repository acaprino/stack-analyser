import { register } from '../../register.js';

register({
  tech: 'pydantic',
  name: 'Pydantic',
  type: 'validation',
  dependencies: [{ type: 'python', name: 'pydantic' }],
});
