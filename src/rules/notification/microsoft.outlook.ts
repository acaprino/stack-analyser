import { register } from '../../register.js';

register({
  tech: 'microsoft.outlook',
  name: 'Microsoft Outlook',
  type: 'notification',
  dotenv: ['OUTLOOK_OAUTH_CLIENT_ID', 'PAPERLESS_OUTLOOK_OAUTH_CLIENT_ID'],
});
