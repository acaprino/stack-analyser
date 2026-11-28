import { register } from '../../register.js';

register({
  tech: 'matlab',
  name: 'MATLAB',
  type: 'language',
  // `.m` is shared with Objective-C: the reader registered with that rule decides by content.
  extensions: ['.matlab'],
});
