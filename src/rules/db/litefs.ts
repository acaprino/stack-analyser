import { register } from '../../register.js';

register({
  tech: 'litefs',
  name: 'LiteFS',
  type: 'db',
  dependencies: [
    { type: 'docker', name: 'flyio/litefs' },
    { type: 'npm', name: 'litefs-js' },
  ],
});
