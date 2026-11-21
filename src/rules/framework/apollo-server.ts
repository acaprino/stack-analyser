import { register } from '../../register.js';

register({
  tech: 'apollo-server',
  name: 'Apollo Server',
  type: 'framework',
  dependencies: [
    { type: 'npm', name: '@apollo/server' },
  ],
});
