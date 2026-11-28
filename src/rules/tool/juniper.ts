import { register } from '../../register.js';

register({
  tech: 'juniper',
  name: 'Juniper',
  type: 'tool',
  dependencies: [{ type: 'rust', name: 'juniper' }],
});
