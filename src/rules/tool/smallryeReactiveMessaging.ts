import { register } from '../../register.js';

register({
  tech: 'smallrye-reactive-messaging',
  name: 'SmallRye Reactive Messaging',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-messaging-kafka' },
    { type: 'maven', name: 'io.smallrye.reactive:smallrye-reactive-messaging-in-memory' },
  ],
});
