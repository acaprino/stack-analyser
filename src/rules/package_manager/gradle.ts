import { register } from '../../register.js';
import { detectGradle } from '../spec/jvm/index.js';

register({
  tech: 'gradle',
  name: 'Gradle',
  type: 'package_manager',
  detect: detectGradle,
  dependencies: [{ type: 'githubAction', name: 'gradle/actions/setup-gradle' }],
});
