import { register } from '../../register.js';

register({
  tech: 'datafast',
  name: 'Datafast',
  type: 'analytics',
  dependencies: [
    { type: 'npm', name: 'datafast' },
    { type: 'npm', name: '@datafast/cli' },
  ],
});
