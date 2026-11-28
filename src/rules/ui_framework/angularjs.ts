import { register } from '../../register.js';

register({
  tech: 'angularjs',
  name: 'AngularJS',
  type: 'ui_framework',
  dependencies: [
    { type: 'npm', name: 'angular' },
    { type: 'nuget', name: 'angularjs' },
  ],
});
