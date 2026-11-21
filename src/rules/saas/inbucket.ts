import { register } from '../../register.js';

register({
  tech: 'inbucket',
  name: 'Inbucket',
  type: 'saas',
  dependencies: [
    { type: 'docker', name: 'inbucket/inbucket' },
  ],
});
