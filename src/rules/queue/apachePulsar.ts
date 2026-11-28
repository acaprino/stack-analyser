import { register } from '../../register.js';

register({
  tech: 'apache-pulsar',
  name: 'Apache Pulsar',
  type: 'queue',
  dependencies: [{ type: 'python', name: 'pulsar-client' }],
});
