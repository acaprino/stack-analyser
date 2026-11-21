import { register } from '../../register.js';

register({
  tech: 'readme',
  name: 'ReadMe',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'readmeio' },
    { type: 'python', name: 'readme-metrics' },
  ],
});
