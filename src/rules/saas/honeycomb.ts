import { register } from '../../register.js';

register({
  tech: 'honeycomb',
  name: 'Honeycomb',
  type: 'saas',
  dependencies: [
    { type: 'python', name: 'libhoney' },
    { type: 'golang', name: 'github.com/honeycombio/libhoney-go' },
  ],
});
