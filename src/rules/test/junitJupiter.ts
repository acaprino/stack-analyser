import { register } from '../../register.js';

register({
  tech: 'junit-jupiter',
  name: 'JUnit Jupiter',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'org.junit.jupiter:junit-jupiter' },
    { type: 'maven', name: 'org.junit.jupiter:junit-jupiter-api' },
    { type: 'maven', name: 'org.junit.jupiter:junit-jupiter-engine' },
  ],
});
