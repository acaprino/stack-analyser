import { register } from '../../register.js';

// The component library for Vue 2; Element Plus (element-plus) is the one for Vue 3.
register({
  tech: 'element-ui',
  name: 'Element UI',
  type: 'ui_framework',
  dependencies: [{ type: 'npm', name: 'element-ui' }],
});
