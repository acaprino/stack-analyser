import { register } from '../../register.js';

register({
  tech: 'connectrpc',
  name: 'Connect',
  type: 'framework',
  dependencies: [{ type: 'golang', name: 'connectrpc.com/connect' }],
});
