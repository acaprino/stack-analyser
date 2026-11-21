import { register } from '../../register.js';

register({
  tech: 'codesandbox',
  name: 'CodeSandbox',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@codesandbox/sdk' }],
});
