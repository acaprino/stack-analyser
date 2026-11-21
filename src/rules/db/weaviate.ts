import { register } from '../../register.js';

register({
  tech: 'weaviate',
  name: 'Weaviate',
  type: 'db',
  dependencies: [
    { type: 'python', name: 'weaviate-client' },
    { type: 'golang', name: 'github.com/weaviate/weaviate-go-client/v4' },
  ],
});
