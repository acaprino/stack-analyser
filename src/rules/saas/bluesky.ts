import { register } from '../../register.js';

register({
  tech: 'bluesky',
  name: 'Bluesky',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@atproto/api' }],
});
