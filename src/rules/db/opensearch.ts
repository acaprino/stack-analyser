import { register } from '../../register.js';

register({
  tech: 'opensearch',
  name: 'OpenSearch',
  type: 'db',
  dependencies: [
    { type: 'python', name: 'opensearch-py' },
    { type: 'golang', name: 'github.com/opensearch-project/opensearch-go/v2' },
    { type: 'docker', name: 'opensearchproject/opensearch' },
  ],
});
