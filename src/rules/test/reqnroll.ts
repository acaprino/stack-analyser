import { register } from '../../register.js';

register({
  tech: 'reqnroll',
  name: 'Reqnroll',
  type: 'test',
  dependencies: [
    { type: 'nuget', name: 'Reqnroll.NUnit' },
  ],
});
