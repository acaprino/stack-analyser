import { register } from '../../register.js';
import { detectSharedExtensions } from '../spec/sharedExtensions/index.js';

register({
  tech: 'objectivec',
  name: 'Objective-C',
  type: 'language',
  // `.m` (also MATLAB) and `.h` (also C) are decided by the content of the file, in `detect`.
  extensions: ['.mm'],
  detect: detectSharedExtensions,
});
