import { register } from '../../register.js';

register({
  tech: 'mstest',
  name: 'MSTest',
  type: 'test',
  dependencies: [
    { type: 'nuget', name: 'MSTest' },
    { type: 'nuget', name: 'MSTest.TestFramework' },
  ],
});
