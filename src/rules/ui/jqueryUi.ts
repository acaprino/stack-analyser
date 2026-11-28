import { register } from '../../register.js';

register({
  tech: 'jquery-ui',
  name: 'jQuery UI',
  type: 'ui',
  dependencies: [
    { type: 'npm', name: 'jquery-ui' },
    { type: 'ruby', name: 'jquery-ui-rails' },
  ],
});
