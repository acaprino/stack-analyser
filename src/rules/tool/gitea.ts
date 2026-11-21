import { register } from '../../register.js';

register({
  tech: 'gitea',
  name: 'Gitea',
  type: 'tool',
  dependencies: [
    { type: 'golang', name: 'code.gitea.io/sdk/gitea' },
  ],
});
