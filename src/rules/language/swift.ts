import { detectSwiftComponent } from '../spec/swiftpm/component.js';
import { register } from '../../register.js';

register({
  tech: 'swift',
  name: 'Swift',
  type: 'language',
  extensions: ['.swift'],
  detect: detectSwiftComponent,
});
