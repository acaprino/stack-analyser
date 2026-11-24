import { register } from '../../register.js';

register({
  tech: 'apache_cassandra',
  name: 'Apache Cassandra',
  type: 'db',
  dependencies: [
    { type: 'docker', name: /^cassandra(?:\/|$)/, example: 'cassandra' },
    { type: 'docker', name: 'bitnami/cassandra' },
    { type: 'rust', name: 'discord-cassandra-cpp' },
    { type: 'rust', name: 'cassandra-cpp' },
    { type: 'npm', name: '@opentelemetry/instrumentation-cassandra-driver' },
    { type: 'python', name: 'cassandra-driver' },
    // The starters bring Spring Data for Apache Cassandra and the Cassandra driver.
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-cassandra' },
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-cassandra-reactive' },
  ],
});
