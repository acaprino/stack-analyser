import { register } from '../../register.js';

register({
  tech: 'internet-archive',
  name: 'Internet Archive',
  type: 'saas',
  dependencies: [
    { type: 'python', name: 'internetarchive' },
  ],
});
