import { register } from '../../register.js';

register({
  tech: 'gitlab.oauth',
  name: 'GitLab OAuth',
  type: 'auth',
  dependencies: [{ type: 'php', name: 'socialiteproviders/gitlab' }],
});
