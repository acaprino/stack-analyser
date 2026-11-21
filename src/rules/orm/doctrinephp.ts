import { register } from '../../register.js';

register({
  tech: 'doctrinephp',
  name: 'Doctrine ORM',
  type: 'orm',
  dependencies: [{ type: 'php', name: 'doctrine/orm' }],
});
