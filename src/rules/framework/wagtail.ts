import { register } from '../../register.js';

register({
  tech: 'wagtail',
  name: 'Wagtail',
  type: 'framework',
  dependencies: [{ type: 'python', name: 'wagtail' }],
});
