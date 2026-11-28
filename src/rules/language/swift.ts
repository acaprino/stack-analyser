import { register } from '../../register.js';
import { detectSwiftComponent } from '../spec/swiftpm/component.js';

register({
  tech: 'swift',
  name: 'Swift',
  type: 'language',
  extensions: ['.swift'],
  detect: detectSwiftComponent,
});
