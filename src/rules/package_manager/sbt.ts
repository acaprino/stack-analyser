import { register } from '../../register.js';
import { detectSbt } from '../spec/jvm/index.js';

register({
  tech: 'sbt',
  name: 'sbt',
  type: 'package_manager',
  detect: detectSbt,
});
