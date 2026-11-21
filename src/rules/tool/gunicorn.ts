import { register } from '../../register.js';

register({
  tech: 'gunicorn',
  name: 'Gunicorn',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'gunicorn' }],
});
