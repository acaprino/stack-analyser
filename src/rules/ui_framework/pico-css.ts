import { register } from '../../register.js';

register({
  tech: 'pico-css',
  name: 'Pico CSS',
  type: 'ui_framework',
  dependencies: [
    { type: 'npm', name: '@picocss/pico' },
  ],
});
