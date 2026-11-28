import { register } from '../../register.js';

register({
  tech: 'urfave-cli',
  name: 'urfave/cli',
  type: 'tool',
  dependencies: [{ type: 'golang', name: 'github.com/urfave/cli' }],
});
