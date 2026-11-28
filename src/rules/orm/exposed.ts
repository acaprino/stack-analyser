import { register } from '../../register.js';

register({
  tech: 'exposed',
  name: 'Exposed',
  type: 'orm',
  dependencies: [
    {
      type: 'maven',
      name: /^org\.jetbrains\.exposed:exposed-/,
      example: 'org.jetbrains.exposed:exposed-core',
    },
  ],
});
