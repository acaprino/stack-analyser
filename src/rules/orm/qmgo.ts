import { register } from '../../register.js';

register({
  tech: 'qmgo',
  name: 'Qmgo',
  type: 'orm',
  dependencies: [
    { type: 'golang', name: 'github.com/qiniu/qmgo' },
  ],
});
