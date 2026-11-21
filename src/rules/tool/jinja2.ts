import { register } from '../../register.js';

register({
  tech: 'jinja2',
  name: 'Jinja',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'jinja2' }],
});
