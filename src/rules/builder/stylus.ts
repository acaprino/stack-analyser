import { register } from '../../register.js';

register({
  tech: 'stylus',
  name: 'Stylus',
  type: 'builder',
  dependencies: [
    { type: 'npm', name: 'stylus' },
  ],
});
