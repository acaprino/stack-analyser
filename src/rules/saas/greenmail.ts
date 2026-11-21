import { register } from '../../register.js';

register({
  tech: 'greenmail',
  name: 'GreenMail',
  type: 'saas',
  dependencies: [
    { type: 'docker', name: 'greenmail/standalone' },
  ],
});
