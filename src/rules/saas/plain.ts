import { register } from '../../register.js';

register({
  tech: 'plain',
  name: 'Plain',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@team-plain/typescript-sdk' },
  ],
});
