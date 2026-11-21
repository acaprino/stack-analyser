import { register } from '../../register.js';

register({
  tech: 'graphiql',
  name: 'GraphiQL',
  type: 'tool',
  dependencies: [
    { type: 'npm', name: 'graphiql' },
  ],
});
