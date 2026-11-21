import { register } from '../../register.js';

register({
  tech: 'mandrill',
  name: 'Mandrill',
  type: 'notification',
  dotenv: ['MANDRILL_API_KEY'],
});
