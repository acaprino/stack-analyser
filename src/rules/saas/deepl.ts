import { register } from '../../register.js';

register({
  tech: 'deepl',
  name: 'DeepL',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'deepl-node' },
    { type: 'python', name: 'deepl' },
  ],
});
