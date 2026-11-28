import { register } from '../../register.js';

register({
  tech: 'mockito',
  name: 'Mockito',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-junit-mockito' },
    { type: 'maven', name: 'org.mockito:mockito-core' },
    { type: 'maven', name: 'org.mockito:mockito-junit-jupiter' },
    // spring-boot-starter-test and the test starter of each Spring Boot 4 module, which depends on it.
    {
      type: 'maven',
      name: /^org\.springframework\.boot:spring-boot-starter-(?:[\w-]+-)?test(?:-classic)?$/,
      example: 'org.springframework.boot:spring-boot-starter-test',
    },
  ],
});
