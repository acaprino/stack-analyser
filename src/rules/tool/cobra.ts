import { register } from '../../register.js';

register({
  tech: 'cobra',
  name: 'Cobra',
  type: 'tool',
  dependencies: [{ type: 'golang', name: 'github.com/spf13/cobra' }],
});
