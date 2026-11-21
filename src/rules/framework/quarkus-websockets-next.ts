import { register } from '../../register.js';

register({
  tech: 'quarkus-websockets-next',
  name: 'Quarkus WebSockets Next',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-websockets-next' },
  ],
});
