import { register } from '../../register.js';

register({
  tech: 'help-scout',
  name: 'Help Scout',
  type: 'saas',
  dotenv: ['HELP_SCOUT_APP_ID', 'HELP_SCOUT_SIGNATURE_KEY'],
});
