import { register } from '../../register.js';

register({
  tech: 'arcgis',
  name: 'ArcGIS',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: '@arcgis/core' },
    { type: 'python', name: 'arcgis' },
  ],
});
