import { register } from '../../register.js';

register({
  tech: 'jinja',
  name: 'Jinja',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'jinja2' }],
});
