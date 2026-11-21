import { register } from '../../register.js';

register({
  tech: 'android',
  name: 'Android',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'com.android.application:com.android.application.gradle.plugin' },
    { type: 'maven', name: 'com.android.library:com.android.library.gradle.plugin' },
    { type: 'maven', name: 'com.android.tools.build:gradle' },
    { type: 'maven', name: /^com\.android\.application$/, example: 'com.android.application' },
    { type: 'maven', name: /^com\.android\.library$/, example: 'com.android.library' },
  ],
});
