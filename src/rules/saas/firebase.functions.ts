import { register } from '../../register.js';

register({
  tech: 'firebase.functions',
  name: 'Cloud Functions for Firebase',
  type: 'saas',
  dependencies: [
    { type: 'python', name: 'firebase-functions' },
    { type: 'npm', name: 'firebase-functions' },
  ],
});
