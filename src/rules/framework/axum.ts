import { register } from '../../register.js';

register({
  tech: 'axum',
  name: 'Axum',
  type: 'framework',
  dependencies: [
    { type: 'rust', name: 'axum' },
  ],
});
