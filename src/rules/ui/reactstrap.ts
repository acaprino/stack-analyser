import { register } from '../../register.js';

// Bootstrap components for React: they need Bootstrap's CSS, and give Bootstrap as well.
register({
  tech: 'reactstrap',
  name: 'Reactstrap',
  type: 'ui',
  dependencies: [{ type: 'npm', name: 'reactstrap' }],
});
