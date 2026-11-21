import { register } from '../../register.js';

register({
  tech: 'spring-data-mongodb',
  name: 'Spring Data MongoDB',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-mongodb' },
  ],
});
