import { register } from '../../register.js';

register({
  tech: 'resilience4j',
  name: 'Resilience4j',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'io.github.resilience4j:resilience4j-micrometer' },
    { type: 'maven', name: 'org.springframework.cloud:spring-cloud-starter-circuitbreaker-reactor-resilience4j' },
    { type: 'maven', name: /^io\.github\.resilience4j:/, example: 'io.github.resilience4j:' },
  ],
});
