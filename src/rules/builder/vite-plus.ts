import { register } from '../../register.js';

register({
  tech: 'vite-plus',
  name: 'Vite+',
  type: 'builder',
  dependencies: [
    { type: 'npm', name: 'vite-plus' },
  ],
});
