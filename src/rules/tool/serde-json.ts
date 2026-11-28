import { register } from '../../register.js';

register({
  tech: 'serde-json',
  name: 'serde_json',
  type: 'tool',
  dependencies: [{ type: 'rust', name: 'serde_json' }],
});
