import { register } from '../../register.js';

register({
  tech: 'tempfile-rust',
  name: 'tempfile',
  type: 'tool',
  dependencies: [
    { type: 'rust', name: 'tempfile' },
  ],
});
