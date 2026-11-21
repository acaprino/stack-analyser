import { register } from '../../register.js';

register({
  tech: 'maildev',
  name: 'MailDev',
  type: 'notification',
  dependencies: [
    { type: 'npm', name: 'maildev' },
  ],
});
