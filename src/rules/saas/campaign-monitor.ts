import { register } from '../../register.js';

register({
  tech: 'campaign-monitor',
  name: 'Campaign Monitor',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'createsend-node' }],
});
