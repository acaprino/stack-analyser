import { register } from '../../register.js';

register({
  tech: 'dotnet-aspire',
  name: '.NET Aspire',
  type: 'framework',
  dependencies: [{ type: 'nuget', name: /^Aspire\./i, example: 'Aspire.AppHost.Sdk' }],
});
