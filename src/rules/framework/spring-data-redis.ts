import { register } from '../../register.js';

register({
  tech: 'spring-data-redis',
  name: 'Spring Data Redis',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-redis' },
  ],
});
