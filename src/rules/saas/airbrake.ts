import { register } from '../../register.js';

register({
  tech: 'airbrake',
  name: 'Airbrake',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@airbrake/node' }],
});
