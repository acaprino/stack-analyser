import { register } from '../../register.js';

register({
  tech: 'powersync',
  name: 'PowerSync',
  type: 'saas',
  dotenv: ['POWERSYNC_TOKEN_LIFETIME', 'POWERSYNC_URL'],
});
