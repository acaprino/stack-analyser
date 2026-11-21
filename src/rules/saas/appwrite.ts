import { register } from '../../register.js';

register({
  tech: 'appwrite',
  name: 'Appwrite',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'appwrite' },
    { type: 'npm', name: 'node-appwrite' },
    { type: 'python', name: 'appwrite' },
    { type: 'golang', name: 'github.com/appwrite/sdk-for-go' },
  ],
});
