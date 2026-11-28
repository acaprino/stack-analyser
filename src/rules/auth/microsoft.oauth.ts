import { register } from '../../register.js';

register({
  tech: 'microsoft.oauth',
  name: 'Microsoft OAuth',
  type: 'auth',
  dependencies: [{ type: 'npm', name: 'passport-microsoft' }],
});
