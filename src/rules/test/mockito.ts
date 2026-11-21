import { register } from '../../register.js';

register({
  tech: 'mockito',
  name: 'Mockito',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-junit-mockito' },
    { type: 'maven', name: 'org.mockito:mockito-core' },
    { type: 'maven', name: 'org.mockito:mockito-junit-jupiter' },
  ],
});
