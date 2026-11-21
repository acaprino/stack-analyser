import { register } from '../../register.js';

register({
  tech: 'mailchannels',
  name: 'MailChannels',
  type: 'notification',
  dotenv: ['NEXT_PRIVATE_MAILCHANNELS_API_KEY'],
});
