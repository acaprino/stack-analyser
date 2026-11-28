import { register } from '../../register.js';

register({
  tech: 'wiremock-java',
  name: 'WireMock',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'io.quarkiverse.wiremock:quarkus-wiremock' },
    { type: 'maven', name: 'org.wiremock:wiremock' },
  ],
});
