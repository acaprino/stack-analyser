import { register } from '../../register.js';

register({
  tech: 'netty',
  name: 'Netty',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'io.netty:netty' },
    { type: 'maven', name: /^io\.netty:netty-/, example: 'io.netty:netty-all' },
  ],
});
