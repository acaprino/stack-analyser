import { register } from '../../register.js';

register({
  tech: 'junit-jupiter',
  name: 'JUnit Jupiter',
  type: 'test',
  dependencies: [
    // Every artifact of the group: the aggregate, the API, the engine, parameterized tests.
    {
      type: 'maven',
      name: /^org\.junit\.jupiter:/,
      example: 'org.junit.jupiter:junit-jupiter-api',
    },
    // The JUnit Jupiter support of another project brings JUnit Jupiter with it.
    { type: 'maven', name: 'io.micronaut.test:micronaut-test-junit5' },
    { type: 'maven', name: 'io.quarkus:quarkus-junit' },
    { type: 'maven', name: 'io.quarkus:quarkus-junit5' },
    { type: 'maven', name: 'org.jetbrains.kotlin:kotlin-test-junit5' },
    { type: 'maven', name: 'org.mockito:mockito-junit-jupiter' },
    { type: 'maven', name: 'org.testcontainers:junit-jupiter' },
    { type: 'maven', name: 'org.testcontainers:testcontainers-junit-jupiter' },
    // spring-boot-starter-test and the test starter of each Spring Boot 4 module, which depends on it.
    {
      type: 'maven',
      name: /^org\.springframework\.boot:spring-boot-starter-(?:[\w-]+-)?test(?:-classic)?$/,
      example: 'org.springframework.boot:spring-boot-starter-test',
    },
  ],
});
