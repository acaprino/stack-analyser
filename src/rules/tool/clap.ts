import { register } from '../../register.js';

register({
  tech: 'clap',
  name: 'clap',
  type: 'tool',
  dependencies: [
    { type: 'rust', name: 'clap' },
  ],
});
