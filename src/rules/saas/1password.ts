import { register } from '../../register.js';

register({
  tech: '1password',
  name: '1Password',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@1password/sdk' },
    { type: 'python', name: 'onepassword-sdk' },
  ],
});
