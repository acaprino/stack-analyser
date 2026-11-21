import { register } from '../../register.js';

register({
  tech: 'dapr',
  name: 'Dapr',
  type: 'runtime',
  dependencies: [
    { type: 'docker', name: 'daprio/sentry' },
    { type: 'docker', name: 'daprio/daprd' },
    { type: 'golang', name: 'github.com/dapr/go-sdk' },
    { type: 'npm', name: '@dapr/dapr' },
    { type: 'nuget', name: 'Dapr.Client' },
    { type: 'nuget', name: 'Dapr.AspNetCore' },
    { type: 'python', name: 'dapr' },
  ],
});
