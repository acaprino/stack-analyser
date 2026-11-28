import { register } from '../../register.js';

register({
  tech: 'lombok',
  name: 'Lombok',
  type: 'tool',
  dependencies: [{ type: 'maven', name: 'org.projectlombok:lombok' }],
});
