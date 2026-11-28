import { register } from '../../register.js';

register({
  tech: 'sea-orm',
  name: 'SeaORM',
  type: 'orm',
  dependencies: [{ type: 'rust', name: 'sea-orm' }],
});
