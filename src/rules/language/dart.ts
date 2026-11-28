import { register } from '../../register.js';
import { detectPubComponent } from '../spec/pub/component.js';

register({
  tech: 'dart',
  name: 'Dart',
  type: 'language',
  extensions: ['.dart'],
  detect: detectPubComponent,
});
