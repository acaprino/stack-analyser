import { register } from '../../register.js';

register({
  tech: 'quarkus',
  name: 'Quarkus',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-arc' },
    { type: 'maven', name: 'io.quarkus:quarkus-core' },
    { type: 'maven', name: 'io.quarkus.platform:quarkus-bom' },
    { type: 'maven', name: 'io.quarkus.platform:quarkus-maven-plugin' },
  ],
});
