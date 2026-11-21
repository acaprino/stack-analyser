import { register } from '../../register.js';

register({
  tech: 'dotnet-maui',
  name: '.NET MAUI',
  type: 'framework',
  dependencies: [
    { type: 'nuget', name: 'Microsoft.Maui.Controls' },
  ],
});
