import { register } from '../../register.js';

register({
  tech: 'vue',
  name: 'Vue.js',
  type: 'ui_framework',
  dependencies: [
    { type: 'npm', name: 'vue' },
    { type: 'maven', name: 'org.webjars.npm:vue' },
  ],
});
