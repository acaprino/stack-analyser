import { register } from '../../register.js';

register({
  tech: 'friendly-captcha',
  name: 'Friendly Captcha',
  type: 'security',
  dotenv: ['FRIENDLY_CAPTCHA_API_KEY', 'FRIENDLY_CAPTCHA_SITEKEY'],
  dependencies: [
    { type: 'npm', name: '@friendlycaptcha/sdk' },
  ],
});
