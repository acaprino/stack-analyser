import { register } from '../../register.js';

register({
  tech: 'spring-boot-admin',
  name: 'Spring Boot Admin',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'de.codecentric:spring-boot-admin-starter-server' },
    { type: 'maven', name: 'de.codecentric:spring-boot-admin-starter-client' },
  ],
});
