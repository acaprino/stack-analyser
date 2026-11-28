import { register } from '../../register.js';

register({
  tech: 'sharpfuzz',
  name: 'SharpFuzz',
  type: 'test',
  dependencies: [{ type: 'nuget', name: 'SharpFuzz' }],
});
