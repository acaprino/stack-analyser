import { register } from '../../register.js';

register({
  tech: 'tree-sitter',
  name: 'Tree-sitter',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'tree-sitter' },
  ],
});
