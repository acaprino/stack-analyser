import { register } from '../../register.js';

register({
  tech: 'mariadb',
  name: 'MariaDB',
  type: 'db',
  dependencies: [
    { type: 'npm', name: 'mariadb', example: 'mariadb' },
    { type: 'docker', name: /^mariadb(?:\/|$)/, example: 'mariadb' },
    { type: 'docker', name: 'bitnami/mariadb' },
    { type: 'docker', name: 'bitnami/mariadb-galera' },
    { type: 'docker', name: 'circleci/mariadb' },
    { type: 'docker', name: 'cimg/mariadb' },
    { type: 'ruby', name: 'tencentcloud-sdk-mariadb' },
  ],
});
