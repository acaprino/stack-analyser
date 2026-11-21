import { register } from '../../register.js';

register({
  tech: 'spring-mvc',
  name: 'Spring MVC',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-webmvc' },
    { type: 'maven', name: 'org.springframework:spring-webmvc' },
    { type: 'maven', name: 'org.springdoc:springdoc-openapi-starter-webmvc-api' },
  ],
});
