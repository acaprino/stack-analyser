import { register } from '../../register.js';

// tui-rs, the crate tui; Ratatui (ratatui) is its fork.
register({
  tech: 'tui-rs',
  name: 'tui-rs',
  type: 'ui_framework',
  dependencies: [{ type: 'rust', name: 'tui' }],
});
