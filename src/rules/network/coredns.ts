import { register } from '../../register.js';

register({
  tech: 'coredns',
  name: 'CoreDNS',
  type: 'network',
  dependencies: [
    { type: 'docker', name: 'coredns/coredns' },
  ],
});
