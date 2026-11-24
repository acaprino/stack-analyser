import { register } from '../../register.js';

register({
  tech: 'quarkus',
  name: 'Quarkus',
  type: 'framework',
  dependencies: [
    // Every artifact of the two Quarkus groups. An extension that is a technology of its own gives that one as well.
    { type: 'maven', name: /^io\.quarkus:/, example: 'io.quarkus:quarkus-arc' },
    { type: 'maven', name: /^io\.quarkus\.platform:/, example: 'io.quarkus.platform:quarkus-bom' },
  ],
});
