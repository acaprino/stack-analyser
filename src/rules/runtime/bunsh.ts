import { register } from '../../register.js';

register({
  tech: 'bunsh',
  name: 'Bun',
  type: 'runtime',
  files: ['bun.lock', 'bun.lockb'],
  dependencies: [{ type: 'githubAction', name: 'oven-sh/setup-bun' }],
});
