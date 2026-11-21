import { register } from '../../register.js';

register({
  tech: 'jetpack-compose',
  name: 'Jetpack Compose',
  type: 'ui_framework',
  dependencies: [
    { type: 'maven', name: 'androidx.compose.material3:material3-adaptive-navigation-suite' },
    { type: 'maven', name: 'androidx.compose.ui:ui-tooling' },
    { type: 'maven', name: 'androidx.compose.ui:ui-tooling-preview' },
    { type: 'maven', name: 'androidx.compose:compose-bom' },
  ],
});
