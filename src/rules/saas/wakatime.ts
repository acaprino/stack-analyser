import { register } from '../../register.js';

register({
  tech: 'wakatime',
  name: 'WakaTime',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'wakatime' }],
});
