import { register } from '../../register.js';

register({
  tech: 'grpc-gateway',
  name: 'gRPC-Gateway',
  type: 'tool',
  dependencies: [{ type: 'golang', name: 'github.com/grpc-ecosystem/grpc-gateway' }],
});
