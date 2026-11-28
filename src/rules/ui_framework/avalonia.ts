import { register } from '../../register.js';

register({
  tech: 'avalonia',
  name: 'Avalonia',
  type: 'ui_framework',
  dependencies: [
    { type: 'nuget', name: 'Avalonia' },
    { type: 'nuget', name: 'Avalonia.Android' },
    { type: 'nuget', name: 'Avalonia.Browser' },
    { type: 'nuget', name: 'Avalonia.Desktop' },
    { type: 'nuget', name: 'Avalonia.iOS' },
    { type: 'nuget', name: 'Avalonia.Themes.Fluent' },
    { type: 'nuget', name: 'Avalonia.Themes.Simple' },
  ],
});
