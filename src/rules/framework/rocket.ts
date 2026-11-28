import { register } from '../../register.js';

register({
  tech: 'rocket',
  name: 'Rocket',
  type: 'framework',
  dependencies: [{ type: 'rust', name: 'rocket' }],
});
