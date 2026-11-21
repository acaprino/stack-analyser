import { register } from '../../register.js';

register({
  tech: 'urql',
  name: 'urql',
  type: 'tool',
  dependencies: [
    { type: 'npm', name: '@urql/core' },
    { type: 'npm', name: '@urql/vue' },
    { type: 'npm', name: 'urql' },
  ],
});
