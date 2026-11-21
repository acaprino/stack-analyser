import { register } from '../../register.js';

register({
  tech: 'spring-data-jpa',
  name: 'Spring Data JPA',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-jpa' },
  ],
});
