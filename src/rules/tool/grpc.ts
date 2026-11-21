import { register } from '../../register.js';

register({
  tech: 'grpc',
  name: 'gRPC',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'grpcio' },
    { type: 'golang', name: 'google.golang.org/grpc' },
    { type: 'npm', name: '@grpc/grpc-js' },
    { type: 'nuget', name: 'Grpc.AspNetCore' },
    { type: 'nuget', name: 'Grpc.Core' },
    { type: 'nuget', name: 'Grpc.Net.Client' },
    { type: 'maven', name: 'io.grpc:grpc-netty' },
    { type: 'maven', name: 'io.grpc:grpc-stub' },
    { type: 'rust', name: 'tonic' },
  ],
});
