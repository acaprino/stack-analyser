import { register } from '../../register.js';

register({
  tech: 'tree-sitter-language-pack',
  name: 'Tree-sitter Language Pack',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'tree-sitter-language-pack' },
  ],
});
