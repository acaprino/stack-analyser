import { register } from '../../register.js';

register({
  tech: 'compose-for-wear-os',
  name: 'Compose for Wear OS',
  type: 'ui_framework',
  dependencies: [
    { type: 'maven', name: 'androidx.wear.compose:compose-foundation' },
    { type: 'maven', name: 'androidx.wear.compose:compose-material' },
    { type: 'maven', name: 'androidx.wear.compose:compose-material3' },
    { type: 'maven', name: 'androidx.wear.compose:compose-navigation' },
  ],
});
