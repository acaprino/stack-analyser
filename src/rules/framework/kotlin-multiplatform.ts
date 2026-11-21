import { register } from '../../register.js';

register({
  tech: 'kotlin-multiplatform',
  name: 'Kotlin Multiplatform',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.jetbrains.kotlin.multiplatform:org.jetbrains.kotlin.multiplatform.gradle.plugin' },
    { type: 'maven', name: /^org\.jetbrains\.kotlin\.multiplatform$/, example: 'org.jetbrains.kotlin.multiplatform' },
  ],
});
