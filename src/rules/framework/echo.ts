import { register } from '../../register.js';

// The module path without a major suffix matches every major version (/v4, /v5) as well.
register({
  tech: 'echo',
  name: 'Echo',
  type: 'framework',
  dependencies: [{ type: 'golang', name: 'github.com/labstack/echo' }],
});
