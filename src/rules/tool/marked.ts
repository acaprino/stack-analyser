import { register } from '../../register.js';

register({
  tech: 'marked',
  name: 'Marked',
  type: 'tool',
  dependencies: [
    { type: 'npm', name: 'marked' },
    { type: 'maven', name: 'org.webjars.npm:marked' },
  ],
});
