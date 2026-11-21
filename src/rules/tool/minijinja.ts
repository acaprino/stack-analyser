import { register } from '../../register.js';

register({
  tech: 'minijinja',
  name: 'MiniJinja',
  type: 'tool',
  dependencies: [
    { type: 'rust', name: 'minijinja' },
  ],
});
