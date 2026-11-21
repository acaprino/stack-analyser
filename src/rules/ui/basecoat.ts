import { register } from '../../register.js';

register({
  tech: 'basecoat',
  name: 'Basecoat',
  type: 'ui',
  dependencies: [
    { type: 'npm', name: 'basecoat-css' },
  ],
});
