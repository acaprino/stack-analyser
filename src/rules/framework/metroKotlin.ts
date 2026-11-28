import { register } from '../../register.js';

register({
  tech: 'metro-kotlin',
  name: 'Metro',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'dev.zacsweers.metro:dev.zacsweers.metro.gradle.plugin' },
    { type: 'maven', name: 'dev.zacsweers.metro:metrox-android' },
    { type: 'maven', name: 'dev.zacsweers.metro:metrox-viewmodel-compose' },
    { type: 'maven', name: /^dev\.zacsweers\.metro$/, example: 'dev.zacsweers.metro' },
  ],
});
