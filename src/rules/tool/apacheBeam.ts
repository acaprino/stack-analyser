import { register } from '../../register.js';

register({
  tech: 'apache-beam',
  name: 'Apache Beam',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'apache-beam' },
    { type: 'golang', name: 'github.com/apache/beam/sdks/v2' },
  ],
});
