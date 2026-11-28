import { register } from '../../register.js';

register({
  tech: 'pyqt',
  name: 'PyQt',
  type: 'ui_framework',
  dependencies: [
    { type: 'python', name: 'PyQt5' },
    { type: 'python', name: 'PyQt6' },
  ],
});
