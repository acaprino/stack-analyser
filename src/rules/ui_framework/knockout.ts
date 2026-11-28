import { register } from '../../register.js';

register({
  tech: 'knockout',
  name: 'Knockout',
  type: 'ui_framework',
  dependencies: [
    { type: 'npm', name: 'knockout' },
    { type: 'nuget', name: 'knockoutjs' },
  ],
});
