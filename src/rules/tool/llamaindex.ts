import { register } from '../../register.js';

register({
  tech: 'llamaindex',
  name: 'LlamaIndex',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'llama-index' }],
});
