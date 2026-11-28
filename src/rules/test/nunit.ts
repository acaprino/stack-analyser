import { register } from '../../register.js';

register({
  tech: 'nunit',
  name: 'NUnit',
  type: 'test',
  dependencies: [{ type: 'nuget', name: 'NUnit' }],
});
