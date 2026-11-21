import { register } from '../../register.js';

register({
  tech: 'ts-rest',
  name: 'ts-rest',
  type: 'tool',
  dependencies: [
    { type: 'npm', name: '@ts-rest/core' },
    { type: 'npm', name: '@ts-rest/open-api' },
    { type: 'npm', name: '@ts-rest/serverless' },
  ],
});
