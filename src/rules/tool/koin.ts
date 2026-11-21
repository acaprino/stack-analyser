import { register } from '../../register.js';

register({
  tech: 'koin',
  name: 'Koin',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: /^io\.insert-koin:koin-/, example: 'io.insert-koin:koin-android' },
  ],
});
