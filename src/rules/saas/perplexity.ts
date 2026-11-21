import { register } from '../../register.js';

register({
  tech: 'perplexity',
  name: 'Perplexity',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@perplexity-ai/perplexity_ai' },
    { type: 'python', name: 'perplexityai' },
  ],
});
