import { register } from '../../register.js';

register({
  tech: 'firebase.messaging',
  name: 'Firebase Cloud Messaging',
  type: 'notification',
  dependencies: [
    { type: 'maven', name: 'com.google.firebase:firebase-messaging' },
    { type: 'maven', name: 'io.github.mirzemehdi:kmpnotifier-push-firebase' },
  ],
});
