import { register } from '../../register.js';

register({
  tech: 'materialize-css',
  name: 'Materialize',
  type: 'ui_framework',
  dependencies: [
    { type: 'npm', name: '@materializecss/materialize' },
  ],
});
