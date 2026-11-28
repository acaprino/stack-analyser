import { register } from '../../register.js';

register({
  tech: 'hibernate-reactive',
  name: 'Hibernate Reactive',
  type: 'orm',
  dependencies: [{ type: 'maven', name: 'io.quarkus:quarkus-hibernate-reactive-panache' }],
});
