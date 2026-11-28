import { register } from '../../register.js';

register({
  tech: 'laravel-nightwatch',
  name: 'Laravel Nightwatch',
  type: 'monitoring',
  dependencies: [{ type: 'php', name: 'laravel/nightwatch' }],
});
