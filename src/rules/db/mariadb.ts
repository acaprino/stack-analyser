import { register } from '../../register.js';

register({
  tech: 'mariadb',
  name: 'MariaDB',
  type: 'db',
  dependencies: [
    { type: 'npm', name: 'mariadb', example: 'mariadb' },
    { type: 'docker', name: /^mariadb(?:\/|$)/, example: 'mariadb' },
    { type: 'ruby', name: 'tencentcloud-sdk-mariadb' },
  ],
});
