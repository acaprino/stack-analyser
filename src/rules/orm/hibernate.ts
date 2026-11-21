import { register } from '../../register.js';

register({
  tech: 'hibernate',
  name: 'Hibernate',
  type: 'orm',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-hibernate-orm-panache' },
    { type: 'maven', name: 'io.quarkus:quarkus-hibernate-orm-panache-kotlin' },
    { type: 'maven', name: 'org.hibernate.orm:hibernate-core' },
    { type: 'maven', name: 'org.hibernate:hibernate-core' },
  ],
});
