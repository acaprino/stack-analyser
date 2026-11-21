import { register } from '../../register.js';

register({
  tech: 'jira-software',
  name: 'Jira Software',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'jira-client' }],
});
