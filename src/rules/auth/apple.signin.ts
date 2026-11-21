import { register } from '../../register.js';

register({
  tech: 'apple.signin',
  name: 'Sign in with Apple',
  type: 'auth',
  dependencies: [
    { type: 'npm', name: 'apple-signin-auth' },
  ],
});
