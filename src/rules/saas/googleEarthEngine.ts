import { register } from '../../register.js';

register({
  tech: 'google-earth-engine',
  name: 'Google Earth Engine',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@google/earthengine' }],
});
