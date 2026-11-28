import { register } from '../../register.js';

// The JVM reader also gives it for Spring Boot's test starters, from Spring Boot 2.2: they held JUnit 4 before.

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
  ],
});
