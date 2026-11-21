import { register } from '../../register.js';

register({
  tech: 'less',
  name: 'Less',
  type: 'builder',
  dependencies: [
    { type: 'npm', name: 'less' },
  ],
});
