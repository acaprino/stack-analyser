import { register } from '../../register.js';

register({
  tech: 'mailpit',
  name: 'Mailpit',
  type: 'notification',
  dependencies: [
    { type: 'docker', name: 'axllent/mailpit' },
  ],
});
