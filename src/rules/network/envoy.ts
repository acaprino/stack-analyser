import { register } from '../../register.js';

register({
  tech: 'envoy',
  name: 'Envoy',
  type: 'network',
  dependencies: [
    { type: 'golang', name: 'github.com/envoyproxy/go-control-plane' },
    { type: 'docker', name: 'envoyproxy/envoy' },
  ],
});
