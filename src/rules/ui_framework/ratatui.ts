import { register } from '../../register.js';

register({
  tech: 'ratatui',
  name: 'Ratatui',
  type: 'ui_framework',
  dependencies: [
    { type: 'rust', name: 'ratatui' },
    { type: 'rust', name: 'ratatui-core' },
  ],
});
