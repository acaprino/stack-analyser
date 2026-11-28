import { register } from '../../register.js';

register({
  tech: 'azure.containerapps',
  name: 'Azure Container Apps',
  type: 'hosting',
  dependencies: [{ type: 'nuget', name: 'Aspire.Hosting.Azure.AppContainers' }],
});
