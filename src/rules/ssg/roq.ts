import { register } from '../../register.js';

register({
  tech: 'roq',
  name: 'Roq',
  type: 'ssg',
  dependencies: [{ type: 'maven', name: 'io.quarkiverse.roq:quarkus-roq' }],
});
