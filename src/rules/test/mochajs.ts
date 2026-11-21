import { register } from '../../register.js';

register({
  tech: 'mochajs',
  name: 'Mocha',
  type: 'test',
  files: /^\.mocharc\.(?:[cm]?js|jsonc?|ya?ml)$/,
  example: '.mocharc.cjs',
  dependencies: [{ type: 'npm', name: 'mocha' }],
});
