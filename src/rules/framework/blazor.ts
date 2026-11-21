import { register } from '../../register.js';

register({
  tech: 'blazor',
  name: 'Blazor',
  type: 'framework',
  dependencies: [
    { type: 'nuget', name: 'Microsoft.AspNetCore.Components.Web' },
    { type: 'nuget', name: 'Microsoft.AspNetCore.Components.WebAssembly' },
    { type: 'nuget', name: 'MudBlazor' },
  ],
});
