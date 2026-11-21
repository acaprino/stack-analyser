import { register } from '../../register.js';

register({
  tech: 'prismic',
  name: 'Prismic',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@prismicio/client' }],
});
