import { register } from '../../register.js';

register({
  tech: 'google.gmail',
  name: 'Gmail',
  type: 'collaboration',
  dependencies: [
    { type: 'npm', name: '@googleapis/gmail' },
    { type: 'ruby', name: 'google-apis-gmail_v1' },
  ],
  dotenv: ['GMAIL_OAUTH_CLIENT_ID', 'PAPERLESS_GMAIL_OAUTH_CLIENT_ID'],
});
