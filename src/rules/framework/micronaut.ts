import { register } from '../../register.js';

register({
  tech: 'micronaut',
  name: 'Micronaut',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'io.micronaut.platform:micronaut-platform' },
    { type: 'maven', name: 'io.micronaut.minimal.application' },
    { type: 'maven', name: 'io.micronaut.minimal.library' },
    { type: 'maven', name: 'io.micronaut.minimal.application:io.micronaut.minimal.application.gradle.plugin' },
    { type: 'maven', name: 'io.micronaut.minimal.library:io.micronaut.minimal.library.gradle.plugin' },
    { type: 'maven', name: /^io\.micronaut/, example: 'io.micronaut' },
  ],
});
