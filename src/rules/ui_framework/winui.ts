import { register } from '../../register.js';

// The NuGet reader also gives it for `UseWinUI`. Microsoft.WindowsAppSDK is not a sign: WPF and Windows Forms
// apps use the Windows App SDK without WinUI.
register({
  tech: 'winui',
  name: 'WinUI',
  type: 'ui_framework',
  dependencies: [
    { type: 'nuget', name: 'Microsoft.UI.Xaml' },
    { type: 'nuget', name: 'Microsoft.WindowsAppSDK.WinUI' },
  ],
});
