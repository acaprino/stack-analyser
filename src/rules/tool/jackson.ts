import { register } from '../../register.js';

register({
  tech: 'jackson',
  name: 'Jackson',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'com.fasterxml.jackson.core:jackson-core' },
    { type: 'maven', name: 'com.fasterxml.jackson.core:jackson-databind' },
    { type: 'maven', name: 'com.fasterxml.jackson.dataformat:jackson-dataformat-yaml' },
    { type: 'maven', name: 'com.fasterxml.jackson.module:jackson-module-kotlin' },
  ],
});
