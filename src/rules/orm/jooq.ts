import { register } from '../../register.js';

register({
  tech: 'jooq',
  name: 'jOOQ',
  type: 'orm',
  dependencies: [
    { type: 'maven', name: 'org.jooq:jooq-kotlin' },
    { type: 'maven', name: 'org.jooq:jooq-postgres-extensions' },
  ],
});
