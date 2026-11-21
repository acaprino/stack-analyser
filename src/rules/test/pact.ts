import { register } from '../../register.js';

register({
  tech: 'pact',
  name: 'Pact',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'io.quarkiverse.pact:quarkus-pact-consumer' },
    { type: 'maven', name: 'io.quarkiverse.pact:quarkus-pact-provider' },
  ],
});
