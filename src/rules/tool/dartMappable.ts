import { register } from '../../register.js';

register({
  tech: 'dart-mappable',
  name: 'dart_mappable',
  type: 'tool',
  dependencies: [
    { type: 'pub', name: 'dart_mappable' },
    { type: 'pub', name: 'dart_mappable_builder' },
  ],
});
