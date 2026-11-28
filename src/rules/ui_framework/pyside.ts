import { register } from '../../register.js';

// PySide6 is an alias of PySide6_Essentials and PySide6_Addons, which a project can declare instead.
register({
  tech: 'pyside',
  name: 'PySide',
  type: 'ui_framework',
  dependencies: [
    { type: 'python', name: 'PySide2' },
    { type: 'python', name: 'PySide6' },
    { type: 'python', name: 'PySide6_Addons' },
    { type: 'python', name: 'PySide6_Essentials' },
  ],
});
