import { register } from '../../register.js';

// senchalabs/connect, "an extensible HTTP server framework for node", not Connect RPC (connectrpc).
register({
  tech: 'connect-node',
  name: 'Connect (Node.js)',
  type: 'framework',
  dependencies: [{ type: 'npm', name: 'connect' }],
});
