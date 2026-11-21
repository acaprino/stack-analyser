import { register } from '../../register.js';

register({
  tech: 'ktor',
  name: 'Ktor',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: /^io\.ktor:ktor-/, example: 'io.ktor:ktor-client-android' },
  ],
});
