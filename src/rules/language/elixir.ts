import { register } from '../../register.js';
import { detectHexComponent } from '../spec/hex/component.js';

register({
  tech: 'elixir',
  name: 'Elixir',
  type: 'language',
  extensions: ['.ex', '.exs'],
  detect: detectHexComponent,
});
