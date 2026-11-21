import { register } from '../../register.js';

register({
  tech: 'lets-encrypt',
  name: 'Let\'s Encrypt',
  type: 'security',
  hosts: ['acme-v02.api.letsencrypt.org'],
  dependencies: [
    { type: 'python', name: 'acme' },
  ],
});
