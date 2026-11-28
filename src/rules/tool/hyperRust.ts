import { register } from '../../register.js';

register({
  tech: 'hyper-rust',
  name: 'Hyper',
  type: 'tool',
  dependencies: [{ type: 'rust', name: 'hyper' }],
});
