import { register } from '../../register.js';

register({
  tech: 'fscheck',
  name: 'FsCheck',
  type: 'test',
  dependencies: [
    { type: 'nuget', name: 'FsCheck.Xunit.v3' },
  ],
});
