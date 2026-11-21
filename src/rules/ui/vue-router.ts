import { register } from '../../register.js';

register({
  tech: 'vue-router',
  name: 'Vue Router',
  type: 'ui',
  dependencies: [
    { type: 'npm', name: 'vue-router' },
    { type: 'maven', name: 'org.webjars.npm:vue-router' },
  ],
});
