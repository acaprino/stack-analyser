import { register } from '../../register.js';

register({
  tech: 'github.oauth',
  name: 'GitHub OAuth',
  type: 'auth',
  dependencies: [
    { type: 'npm', name: 'passport-github2' },
    { type: 'npm', name: 'remix-auth-github' },
  ],
});
