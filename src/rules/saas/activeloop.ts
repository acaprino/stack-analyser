import { register } from '../../register.js';

register({
  tech: 'activeloop',
  name: 'Activeloop',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'deeplake' }],
});
