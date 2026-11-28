import { register } from '../../register.js';

register({
  tech: 'oapi-codegen',
  name: 'oapi-codegen',
  type: 'tool',
  dependencies: [{ type: 'golang', name: 'github.com/oapi-codegen/oapi-codegen' }],
});
