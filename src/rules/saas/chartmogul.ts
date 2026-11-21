import { register } from '../../register.js';

register({
  tech: 'chartmogul',
  name: 'ChartMogul',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'chartmogul-node' },
    { type: 'python', name: 'chartmogul' },
  ],
});
