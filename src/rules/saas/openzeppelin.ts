import { register } from '../../register.js';

register({
  tech: 'openzeppelin',
  name: 'OpenZeppelin',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@openzeppelin/defender-sdk' }],
});
