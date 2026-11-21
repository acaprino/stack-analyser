import { register } from '../../register.js';

register({
  tech: 'openrouter',
  name: 'OpenRouter',
  type: 'ai',
  dependencies: [
    { type: 'npm', name: '@openrouter/sdk' },
    { type: 'python', name: 'openrouter' },
  ],
});
