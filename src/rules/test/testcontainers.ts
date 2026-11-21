import { register } from '../../register.js';

register({
  tech: 'testcontainers',
  name: 'Testcontainers',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'org.testcontainers:junit-jupiter' },
    { type: 'maven', name: 'org.testcontainers:testcontainers' },
    { type: 'maven', name: 'org.testcontainers:testcontainers-junit-jupiter' },
    { type: 'maven', name: 'org.testcontainers:testcontainers-postgresql' },
    { type: 'python', name: 'testcontainers' },
    { type: 'nuget', name: 'Testcontainers' },
    { type: 'golang', name: 'github.com/testcontainers/testcontainers-go' },
  ],
});
