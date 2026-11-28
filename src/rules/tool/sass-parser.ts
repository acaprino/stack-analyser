import { register } from '../../register.js';

register({
  tech: 'sass-parser',
  name: 'Sass parser',
  type: 'tool',
  dependencies: [{ type: 'npm', name: 'sass-parser' }],
});
