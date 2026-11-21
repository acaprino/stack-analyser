import { register } from '../../register.js';

register({
  tech: 'proptest',
  name: 'proptest',
  type: 'test',
  dependencies: [
    { type: 'rust', name: 'proptest' },
  ],
});
