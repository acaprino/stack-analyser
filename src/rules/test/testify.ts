import { register } from '../../register.js';

register({
  tech: 'testify',
  name: 'testify',
  type: 'test',
  dependencies: [{ type: 'golang', name: 'github.com/stretchr/testify' }],
});
