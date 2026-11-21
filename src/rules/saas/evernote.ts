import { register } from '../../register.js';

register({
  tech: 'evernote',
  name: 'Evernote',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'evernote' }],
});
