import { register } from '../../register.js';

register({
  tech: 'messagepack-dotnet',
  name: 'MessagePack',
  type: 'tool',
  dependencies: [{ type: 'nuget', name: 'MessagePack' }],
});
