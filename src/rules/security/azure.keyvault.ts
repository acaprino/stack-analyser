import { register } from '../../register.js';

register({
  tech: 'azure.keyvault',
  name: 'Azure Key Vault',
  type: 'security',
  dotenv: ['AZURE_KEY_VAULT_ENDPOINT'],
  dependencies: [{ type: 'nuget', name: 'Azure.Extensions.AspNetCore.Configuration.Secrets' }],
});
