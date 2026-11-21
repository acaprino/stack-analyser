import { register } from '../../register.js';

register({
  tech: 'serde',
  name: 'Serde',
  type: 'tool',
  dependencies: [
    { type: 'rust', name: 'serde' },
  ],
});
