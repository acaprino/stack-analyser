import { register } from '../../register.js';

// No package: the NuGet reader gives it for `UseWPF` or a reference to the PresentationFramework assembly.
register({
  tech: 'wpf',
  name: 'WPF',
  type: 'ui_framework',
});
