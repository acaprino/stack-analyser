import { register } from '../../register.js';

register({
  tech: 'detox',
  name: 'Detox',
  type: 'test',
  dependencies: [
    { type: 'npm', name: 'detox' },
  ],
});
