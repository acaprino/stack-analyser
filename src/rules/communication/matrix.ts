import { register } from '../../register.js';

register({
  tech: 'matrix',
  name: 'Matrix',
  type: 'communication',
  dependencies: [{ type: 'npm', name: 'matrix-js-sdk' }],
});
