import { register } from '../../register.js';

register({
  tech: 'xunit',
  name: 'xUnit',
  type: 'test',
  dependencies: [
    { type: 'nuget', name: 'xunit' },
    { type: 'nuget', name: 'xunit.core' },
    { type: 'nuget', name: 'xunit.v3' },
    { type: 'nuget', name: 'xunit.v3.mtp-off' },
    { type: 'nuget', name: 'xunit.v3.mtp-v2' },
  ],
});
