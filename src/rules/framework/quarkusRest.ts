import { register } from '../../register.js';

register({
  tech: 'quarkus-rest',
  name: 'Quarkus REST',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-rest' },
    { type: 'maven', name: 'io.quarkus:quarkus-rest-jackson' },
    { type: 'maven', name: 'io.quarkus:quarkus-rest-qute' },
  ],
});
