import { register } from '../../register.js';

register({
  tech: 'h2',
  name: 'H2',
  type: 'db',
  dependencies: [
    { type: 'maven', name: 'com.h2database:h2' },
  ],
});
