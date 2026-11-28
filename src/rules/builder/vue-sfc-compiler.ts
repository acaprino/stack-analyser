import { register } from '../../register.js';

register({
  tech: 'vue-sfc-compiler',
  name: 'Vue SFC compiler',
  type: 'builder',
  dependencies: [{ type: 'npm', name: '@vue/compiler-sfc' }],
});
