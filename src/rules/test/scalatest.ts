import { register } from '../../register.js';

register({
  tech: 'scalatest',
  name: 'ScalaTest',
  type: 'test',
  dependencies: [
    { type: 'maven', name: /^org\.scalatest:scalatest(?:[-_][a-z0-9._-]+)?$/, example: 'org.scalatest:scalatest' },
  ],
});
