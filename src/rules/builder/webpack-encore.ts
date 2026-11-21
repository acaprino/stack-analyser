import { register } from '../../register.js';

register({
  tech: 'webpack-encore',
  name: 'Webpack Encore',
  type: 'builder',
  dependencies: [
    { type: 'npm', name: '@symfony/webpack-encore' },
  ],
});
