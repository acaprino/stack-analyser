import { register } from '../../register.js';

// Uno.Sdk is the project SDK (`<Project Sdk="Uno.Sdk">`); older projects reference the framework package.
register({
  tech: 'uno-platform',
  name: 'Uno Platform',
  type: 'ui_framework',
  dependencies: [
    { type: 'nuget', name: 'Uno.Sdk' },
    { type: 'nuget', name: 'Uno.UI' },
    { type: 'nuget', name: 'Uno.WinUI' },
  ],
});
