import { register } from '../../register.js';

register({
  tech: 'actixweb',
  name: 'Actix Web',
  type: 'framework',
  dependencies: [{ type: 'rust', name: 'actix-web' }],
});
