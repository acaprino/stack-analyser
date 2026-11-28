import { register } from '../../register.js';

register({
  tech: 'firebase.analytics',
  name: 'Firebase Analytics',
  type: 'analytics',
  dependencies: [{ type: 'maven', name: 'com.google.firebase:firebase-analytics' }],
});
