import { register } from '../../register.js';

register({
  tech: 'fastly',
  name: 'Fastly',
  type: 'hosting',
  dotenv: ['FASTLY_', 'HEXPM_FASTLY_KEY'],
  dependencies: [
    { type: 'rust', name: 'fastly-api' },
    {
      type: 'ruby',
      name: 'fastly',
    },
    { type: 'npm', name: 'fastly' },
    {
      type: 'npm',
      name: /^@fastly\//,
      example: '@fastly/performance-observer-polyfill',
    },
    { type: 'npm', name: 'fastly/fastly' },
  ],
});
