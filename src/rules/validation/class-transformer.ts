import { register } from '../../register.js';

register({
  tech: 'class-transformer',
  name: 'class-transformer',
  type: 'validation',
  dependencies: [
    { type: 'npm', name: 'class-transformer' },
  ],
});
