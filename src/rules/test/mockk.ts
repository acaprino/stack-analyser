import { register } from '../../register.js';

register({
  tech: 'mockk',
  name: 'MockK',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'io.mockk:mockk' },
    { type: 'maven', name: 'io.quarkiverse.mockk:quarkus-junit5-mockk' },
  ],
});
