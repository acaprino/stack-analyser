import { register } from '../../register.js';

// No package: the NuGet reader gives it for `UseWindowsForms` or a reference to the System.Windows.Forms assembly.
register({
  tech: 'winforms',
  name: 'Windows Forms',
  type: 'ui_framework',
});
