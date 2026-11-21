import { register } from '../../register.js';

register({
  tech: 'caddy',
  name: 'Caddy',
  type: 'app',
  files: /^(?:.+\.)?Caddyfile$/,
  example: 'test.Caddyfile',
  dependencies: [
    { type: 'docker', name: /^caddy(?:\/|$)/, example: 'caddy' },
    { type: 'golang', name: 'github.com/caddyserver/caddy/v2' },
  ],
});
