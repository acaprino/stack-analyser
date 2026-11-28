import { register } from '../../register.js';

register({
  tech: 'picocli',
  name: 'picocli',
  type: 'tool',
  dependencies: [{ type: 'maven', name: 'info.picocli:picocli' }],
});
