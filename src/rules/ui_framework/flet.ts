import { register } from '../../register.js';

register({
  tech: 'flet',
  name: 'Flet',
  type: 'ui_framework',
  dependencies: [
    { type: 'pub', name: 'flet' },
    { type: 'python', name: 'flet' },
    { type: 'python', name: 'flet-cli' },
    { type: 'python', name: 'flet-desktop' },
    { type: 'python', name: 'flet-web' },
  ],
});
