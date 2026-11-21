import { register } from '../../register.js';

register({
  tech: 'coil',
  name: 'Coil',
  type: 'ui',
  dependencies: [
    { type: 'maven', name: 'io.coil-kt.coil3:coil-compose' },
    { type: 'maven', name: 'io.coil-kt.coil3:coil-network-ktor3' },
  ],
});
