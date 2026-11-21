import { register } from '../../register.js';

register({
  tech: 'maxmind',
  name: 'MaxMind',
  type: 'saas',
  dotenv: ['MAXMIND_LICENSE_KEY'],
});
