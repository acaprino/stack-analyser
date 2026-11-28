import { register } from '../../register.js';

register({
  tech: 'pyyaml',
  name: 'PyYAML',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'PyYAML' }],
});
