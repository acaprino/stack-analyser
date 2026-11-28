import { register } from '../../register.js';

// Angular widgets built on Bootstrap's CSS: they give Bootstrap as well.
register({
  tech: 'ng-bootstrap',
  name: 'ng-bootstrap',
  type: 'ui',
  dependencies: [{ type: 'npm', name: '@ng-bootstrap/ng-bootstrap' }],
});
