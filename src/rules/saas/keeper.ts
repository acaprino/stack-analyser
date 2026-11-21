import { register } from '../../register.js';

register({
  tech: 'keeper',
  name: 'Keeper',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@keeper-security/secrets-manager-core' },
    { type: 'python', name: 'keepercommander' },
  ],
});
