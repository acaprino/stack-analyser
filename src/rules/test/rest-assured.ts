import { register } from '../../register.js';

register({
  tech: 'rest-assured',
  name: 'REST Assured',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'io.rest-assured:rest-assured' },
  ],
});
