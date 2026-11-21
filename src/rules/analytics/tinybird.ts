import { register } from '../../register.js';

register({
  tech: 'tinybird',
  name: 'Tinybird',
  type: 'analytics',
  dotenv: ['TINYBIRD', 'TINYBIRD_'],
  dependencies: [
    {
      type: 'npm',
      name: /^@tinybirdco\//,
      example: '@tinybirdco/next-tinybird',
    },
  ],
});
