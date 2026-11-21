import { register } from '../../register.js';

register({
  tech: 'google.oauth',
  name: 'Google OAuth',
  type: 'auth',
  dependencies: [
    { type: 'npm', name: 'passport-google-oauth' },
    { type: 'npm', name: 'passport-google-oauth20' },
  ],
});
