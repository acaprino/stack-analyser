import { register } from '../../register.js';

register({
  tech: 'junit',
  name: 'JUnit',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'junit:junit' },
  ],
});
