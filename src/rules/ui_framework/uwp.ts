import { register } from '../../register.js';

// The NuGet reader also gives it for `UseUwp`, the property of a UWP app on modern .NET.
register({
  tech: 'uwp',
  name: 'UWP',
  type: 'ui_framework',
  dependencies: [{ type: 'nuget', name: 'Microsoft.NETCore.UniversalWindowsPlatform' }],
});
