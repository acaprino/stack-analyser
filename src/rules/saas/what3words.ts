import { register } from '../../register.js';

register({
  tech: 'what3words',
  name: 'what3words',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@what3words/api' },
    { type: 'python', name: 'what3words' },
  ],
});
