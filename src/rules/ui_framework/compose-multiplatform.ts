import { register } from '../../register.js';

register({
  tech: 'compose-multiplatform',
  name: 'Compose Multiplatform',
  type: 'ui_framework',
  dependencies: [
    { type: 'maven', name: 'org.jetbrains.compose:org.jetbrains.compose.gradle.plugin' },
    { type: 'maven', name: /^org\.jetbrains\.compose$/, example: 'org.jetbrains.compose' },
  ],
});
