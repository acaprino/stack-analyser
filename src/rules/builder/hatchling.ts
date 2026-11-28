import { register } from '../../register.js';

register({
  tech: 'hatchling',
  name: 'Hatchling',
  type: 'builder',
  dependencies: [{ type: 'python', name: 'hatchling' }],
});
