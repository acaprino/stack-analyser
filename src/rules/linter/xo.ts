import { register } from '../../register.js';

register({
  tech: 'xo',
  name: 'XO',
  type: 'linter',
  dependencies: [{ type: 'npm', name: 'xo' }],
});
