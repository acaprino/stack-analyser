import { register } from '../../register.js';

register({
  tech: 'robolectric',
  name: 'Robolectric',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'org.robolectric:robolectric' },
  ],
});
