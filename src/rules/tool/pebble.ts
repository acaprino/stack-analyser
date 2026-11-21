import { register } from '../../register.js';

register({
  tech: 'pebble',
  name: 'Pebble',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'io.pebbletemplates:pebble' },
  ],
});
