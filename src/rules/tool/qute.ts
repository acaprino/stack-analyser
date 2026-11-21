import { register } from '../../register.js';

register({
  tech: 'qute',
  name: 'Qute',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-rest-qute' },
  ],
});
