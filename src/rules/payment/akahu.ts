import { register } from '../../register.js';

register({
  tech: 'akahu',
  name: 'Akahu',
  type: 'payment',
  dependencies: [
    { type: 'npm', name: 'akahu' },
  ],
});
