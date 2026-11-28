import { register } from '../../register.js';

register({
  tech: 'strawberry-graphql',
  name: 'Strawberry GraphQL',
  type: 'framework',
  dependencies: [
    { type: 'python', name: 'strawberry-graphql' },
    { type: 'python', name: 'strawberry-graphql-django' },
  ],
});
