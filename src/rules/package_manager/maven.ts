import { register } from '../../register.js';
import { detectMaven } from '../spec/jvm/index.js';

register({
  tech: 'maven',
  name: 'Maven',
  type: 'package_manager',
  detect: detectMaven,
});
