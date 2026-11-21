import { register } from '../../register.js';

register({
  tech: 'horologist',
  name: 'Horologist',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'com.google.android.horologist:horologist-compose-layout' },
    { type: 'maven', name: 'com.google.android.horologist:horologist-tiles' },
  ],
});
