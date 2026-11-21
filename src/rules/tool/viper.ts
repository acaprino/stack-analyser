import { register } from '../../register.js';

register({
  tech: 'viper',
  name: 'Viper',
  type: 'tool',
  dependencies: [{ type: 'golang', name: 'github.com/spf13/viper' }],
});
