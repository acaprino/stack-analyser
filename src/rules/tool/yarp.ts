import { register } from '../../register.js';

register({
  tech: 'yarp',
  name: 'YARP',
  type: 'tool',
  dependencies: [
    { type: 'nuget', name: 'Aspire.Hosting.Yarp' },
    { type: 'nuget', name: 'Microsoft.Extensions.ServiceDiscovery.Yarp' },
    { type: 'nuget', name: 'Yarp.ReverseProxy' },
  ],
});
