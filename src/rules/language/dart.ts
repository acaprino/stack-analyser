import { detectPubComponent } from '../spec/pub/component.js';
import { register } from '../../register.js';

register({
  tech: 'dart',
  name: 'Dart',
  type: 'language',
  extensions: ['.dart'],
  detect: detectPubComponent,
});
