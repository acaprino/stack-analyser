import { register } from '../../register.js';

register({
  tech: 'graphql-client-rust',
  name: 'graphql_client',
  type: 'tool',
  dependencies: [
    { type: 'rust', name: 'graphql_client' },
  ],
});
