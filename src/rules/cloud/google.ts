import { register } from '../../register.js';

register({
  tech: 'google',
  name: 'Google',
  type: 'cloud',
  dependencies: [
    { type: 'npm', name: 'googleapis' },
    { type: 'npm', name: 'google-auth-library' },
    { type: 'python', name: 'google-api-python-client' },
  ],
});
