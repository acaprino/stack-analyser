import { register } from '../../register.js';

register({
  tech: 'jfrog',
  name: 'JFrog',
  type: 'saas',
  dependencies: [{ type: 'golang', name: 'github.com/jfrog/jfrog-client-go' }],
});
