import { register } from '../../register.js';

register({
  tech: 'internet-computer',
  name: 'Internet Computer',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@dfinity/agent' }],
});
