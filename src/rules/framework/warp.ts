import { register } from '../../register.js';

register({
  tech: 'warp',
  name: 'Warp',
  type: 'framework',
  dependencies: [{ type: 'rust', name: 'warp' }],
});
