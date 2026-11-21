import { register } from '../../register.js';

register({
  tech: 'sqldelight',
  name: 'SQLDelight',
  type: 'builder',
  dependencies: [
    { type: 'maven', name: 'app.cash.sqldelight:android-driver' },
    { type: 'maven', name: 'app.cash.sqldelight:app.cash.sqldelight.gradle.plugin' },
    { type: 'maven', name: 'app.cash.sqldelight:native-driver' },
    { type: 'maven', name: 'app.cash.sqldelight:runtime' },
    { type: 'maven', name: 'app.cash.sqldelight:sqlite-driver' },
    { type: 'maven', name: 'app.cash.sqldelight:web-worker-driver' },
    { type: 'maven', name: /^app\.cash\.sqldelight$/, example: 'app.cash.sqldelight' },
  ],
});
