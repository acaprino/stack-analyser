import { register } from '../../register.js';

register({
  tech: 'lm-studio',
  name: 'LM Studio',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@lmstudio/sdk' },
    { type: 'python', name: 'lmstudio' },
  ],
});
