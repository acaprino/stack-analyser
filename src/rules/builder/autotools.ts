import { register } from '../../register.js';

register({
  tech: 'autotools',
  name: 'GNU Autotools',
  type: 'builder',
  // `configure.in` is the name autoconf read before `configure.ac`.
  files: ['configure.ac', 'configure.in'],
});
