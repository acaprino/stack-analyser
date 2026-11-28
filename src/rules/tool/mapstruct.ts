import { register } from '../../register.js';

register({
  tech: 'mapstruct',
  name: 'MapStruct',
  type: 'tool',
  dependencies: [{ type: 'maven', name: 'org.mapstruct:mapstruct' }],
});
