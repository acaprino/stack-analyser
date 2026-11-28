import { register } from '../../register.js';

register({
  tech: 'papercut-smtp',
  name: 'Papercut SMTP',
  type: 'notification',
  dependencies: [{ type: 'docker', name: 'jijiechen/papercut' }],
});
