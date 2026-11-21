import { register } from '../../register.js';

register({
  tech: 'thymeleaf',
  name: 'Thymeleaf',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-thymeleaf' },
    { type: 'maven', name: 'org.thymeleaf:thymeleaf' },
  ],
});
