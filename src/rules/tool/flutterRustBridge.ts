import { register } from '../../register.js';

register({
  tech: 'flutter-rust-bridge',
  name: 'flutter_rust_bridge',
  type: 'tool',
  dependencies: [
    { type: 'rust', name: 'flutter_rust_bridge' },
    { type: 'pub', name: 'flutter_rust_bridge' },
  ],
});
