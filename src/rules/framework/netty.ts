import { register } from '../../register.js';

// The modules an application programs against. The native resolvers and tcnative of the same group are fixes a
// Spring WebFlux or gRPC project adds for its platform, not a sign that it writes Netty code.
register({
  tech: 'netty',
  name: 'Netty',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'io.netty:netty' },
    { type: 'maven', name: 'io.netty:netty-all' },
    { type: 'maven', name: 'io.netty:netty-buffer' },
    { type: 'maven', name: 'io.netty:netty-codec' },
    { type: 'maven', name: 'io.netty:netty-codec-http' },
    { type: 'maven', name: 'io.netty:netty-codec-http2' },
    { type: 'maven', name: 'io.netty:netty-common' },
    { type: 'maven', name: 'io.netty:netty-handler' },
    { type: 'maven', name: 'io.netty:netty-transport' },
  ],
});
