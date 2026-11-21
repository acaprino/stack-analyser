import { register } from '../../register.js';

register({
  tech: 'cats',
  name: 'Cats',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: /^org\.typelevel:cats-core(?:_[a-z0-9.]+)?$/, example: 'org.typelevel:cats-core' },
  ],
});
