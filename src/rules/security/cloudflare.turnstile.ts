import { register } from '../../register.js';

register({
  tech: 'cloudflare.turnstile',
  name: 'Cloudflare Turnstile',
  type: 'security',
  dotenv: ['TURNSTILE_SECRET_KEY', 'TURNSTILE_SITE_KEY'],
  dependencies: [{ type: 'npm', name: '@marsidev/react-turnstile' }],
});
