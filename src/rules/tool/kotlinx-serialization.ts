import { register } from '../../register.js';

register({
  tech: 'kotlinx-serialization',
  name: 'kotlinx.serialization',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'org.jetbrains.kotlin.plugin.serialization:org.jetbrains.kotlin.plugin.serialization.gradle.plugin' },
    { type: 'maven', name: /^org\.jetbrains\.kotlin\.plugin\.serialization$/, example: 'org.jetbrains.kotlin.plugin.serialization' },
    { type: 'maven', name: /^org\.jetbrains\.kotlinx:kotlinx-serialization-/, example: 'org.jetbrains.kotlinx:kotlinx-serialization-cbor' },
  ],
});
