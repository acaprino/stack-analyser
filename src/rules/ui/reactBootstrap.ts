import { register } from '../../register.js';

// Bootstrap components for React: they need Bootstrap's CSS, and give Bootstrap as well.
register({
  tech: 'react-bootstrap',
  name: 'React Bootstrap',
  type: 'ui',
  dependencies: [{ type: 'npm', name: 'react-bootstrap' }],
});
