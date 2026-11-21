import { register } from '../../register.js';

register({
  tech: 'google.recaptcha',
  name: 'Google reCAPTCHA',
  type: 'security',
  dotenv: ['RECAPTCHA_PRIVATE_KEY', 'RECAPTCHA_PUBLIC_KEY'],
  dependencies: [
    { type: 'python', name: 'django-recaptcha' },
  ],
});
