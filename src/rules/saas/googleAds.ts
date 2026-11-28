import { register } from '../../register.js';

register({
  tech: 'google-ads',
  name: 'Google Ads',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'google-ads-api' },
    { type: 'python', name: 'google-ads' },
  ],
});
