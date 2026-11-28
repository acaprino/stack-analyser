import { register } from '../../register.js';

register({
  tech: 'browserless',
  name: 'Browserless',
  type: 'saas',
  dotenv: ['NEXT_PRIVATE_BROWSERLESS_URL'],
  dependencies: [{ type: 'docker', name: 'ghcr.io/browserless/chromium' }],
});
