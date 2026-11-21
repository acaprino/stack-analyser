import { register } from '../../register.js';

register({
  tech: 'pnpm',
  name: 'pnpm',
  type: 'package_manager',
  files: ['pnpm-lock.yaml'],
  dependencies: [{ type: 'githubAction', name: 'pnpm/action-setup' }],
});
