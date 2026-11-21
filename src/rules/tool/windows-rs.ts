import { register } from '../../register.js';

register({
  tech: 'windows-rs',
  name: 'Windows for Rust',
  type: 'tool',
  dependencies: [
    { type: 'rust', name: 'windows-core' },
    { type: 'rust', name: 'windows-sys' },
  ],
});
