import { register } from '../../register.js';

register({
  tech: 'middleman',
  name: 'Middleman',
  type: 'ssg',
  dependencies: [
    { type: 'ruby', name: 'middleman' },
    { type: 'ruby', name: 'middleman-core' },
  ],
});
