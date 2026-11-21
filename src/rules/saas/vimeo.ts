import { register } from '../../register.js';

register({
  tech: 'vimeo',
  name: 'Vimeo',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@vimeo/vimeo' }],
});
