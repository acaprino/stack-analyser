import { register } from '../../register.js';

register({
  tech: 'spring-webflux',
  name: 'Spring WebFlux',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-webflux' },
    { type: 'maven', name: 'org.springframework:spring-webflux' },
  ],
});
