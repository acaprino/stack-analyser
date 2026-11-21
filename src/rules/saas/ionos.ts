import { register } from '../../register.js';

register({
  tech: 'ionos',
  name: 'Ionos',
  type: 'saas',
  dependencies: [
    { type: 'python', name: 'ionoscloud' },
    { type: 'golang', name: 'github.com/ionos-cloud/sdk-go/v6' },
  ],
});
