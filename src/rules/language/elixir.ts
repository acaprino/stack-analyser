import { detectHexComponent } from '../spec/hex/component.js';
import { register } from '../../register.js';

register({
  tech: 'elixir',
  name: 'Elixir',
  type: 'language',
  extensions: ['.ex', '.exs'],
  detect: detectHexComponent,
});
