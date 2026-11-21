import { register } from '../../register.js';
import { detectMaestroFlow } from '../spec/maestro/component.js';

register({
  tech: 'maestro',
  name: 'Maestro',
  type: 'test',
  detect: detectMaestroFlow,
});
