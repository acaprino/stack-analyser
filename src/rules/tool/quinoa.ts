import { register } from '../../register.js';

register({
  tech: 'quinoa',
  name: 'Quinoa',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'io.quarkiverse.quinoa:quarkus-quinoa' },
    { type: 'maven', name: 'io.quarkiverse.quinoa:quarkus-quinoa-testing' },
  ],
});
