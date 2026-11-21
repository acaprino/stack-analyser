import { register } from '../../register.js';

register({
  tech: 'polars',
  name: 'Polars',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'polars' },
    { type: 'rust', name: 'polars' },
  ],
});
