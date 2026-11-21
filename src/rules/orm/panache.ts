import { register } from '../../register.js';

register({
  tech: 'panache',
  name: 'Panache',
  type: 'orm',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-hibernate-orm-panache' },
    { type: 'maven', name: 'io.quarkus:quarkus-hibernate-orm-panache-kotlin' },
    { type: 'maven', name: 'io.quarkus:quarkus-hibernate-reactive-panache' },
    { type: 'maven', name: 'io.quarkus:quarkus-mongodb-panache' },
  ],
});
