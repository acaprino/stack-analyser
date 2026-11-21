import { register } from '../../register.js';

register({
  tech: 'chi',
  name: 'Chi',
  type: 'framework',
  dependencies: [
    { type: 'golang', name: 'github.com/go-chi/chi' },
  ],
});
