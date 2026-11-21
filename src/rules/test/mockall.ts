import { register } from '../../register.js';

register({
  tech: 'mockall',
  name: 'Mockall',
  type: 'test',
  dependencies: [
    { type: 'rust', name: 'mockall' },
  ],
});
