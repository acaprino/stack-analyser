import { register } from '../../register.js';

register({
  tech: 'dart-test',
  name: 'test',
  type: 'test',
  dependencies: [
    { type: 'pub', name: 'test' },
  ],
});
