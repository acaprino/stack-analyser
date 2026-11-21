import { register } from '../../register.js';

register({
  tech: 'dompurify',
  name: 'DOMPurify',
  type: 'tool',
  dependencies: [
    { type: 'npm', name: 'dompurify' },
    { type: 'maven', name: 'org.webjars.npm:dompurify' },
  ],
});
