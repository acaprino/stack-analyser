import { register } from '../../register.js';

register({
  tech: 'rstest',
  name: 'rstest',
  type: 'test',
  dependencies: [
    { type: 'rust', name: 'rstest' },
  ],
});
