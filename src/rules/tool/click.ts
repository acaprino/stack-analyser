import { register } from '../../register.js';

register({
  tech: 'click',
  name: 'Click',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'click' }],
});
