import { register } from '../../register.js';

register({
  tech: 'hcaptcha',
  name: 'hCaptcha',
  type: 'security',
  dotenv: ['HEXPM_HCAPTCHA_SECRET'],
});
