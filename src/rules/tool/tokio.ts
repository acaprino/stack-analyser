import { register } from '../../register.js';

register({
  tech: 'tokio',
  name: 'Tokio',
  type: 'tool',
  dependencies: [{ type: 'rust', name: 'tokio' }],
});
