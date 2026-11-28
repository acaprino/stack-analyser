import { register } from '../../register.js';

// Jersey 1 (com.sun.jersey) and Jersey 2 and later (org.glassfish.jersey).
register({
  tech: 'jersey',
  name: 'Jersey',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'com.sun.jersey:jersey-server' },
    { type: 'maven', name: 'org.glassfish.jersey.core:jersey-server' },
  ],
});
