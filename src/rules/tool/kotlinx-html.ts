import { register } from '../../register.js';

register({
  tech: 'kotlinx-html',
  name: 'kotlinx.html',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'org.jetbrains.kotlinx:kotlinx-html-jvm' },
  ],
});
