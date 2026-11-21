import { register } from '../../register.js';

register({
  tech: 'todoist',
  name: 'Todoist',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@doist/todoist-api-typescript' },
    { type: 'python', name: 'todoist-api-python' },
  ],
});
