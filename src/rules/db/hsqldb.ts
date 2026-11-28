import { register } from '../../register.js';

register({
  tech: 'hsqldb',
  name: 'HSQLDB',
  type: 'db',
  dependencies: [{ type: 'maven', name: 'org.hsqldb:hsqldb' }],
});
