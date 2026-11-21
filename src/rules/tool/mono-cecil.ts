import { register } from '../../register.js';

register({
  tech: 'mono-cecil',
  name: 'Mono.Cecil',
  type: 'tool',
  dependencies: [
    { type: 'nuget', name: 'Mono.Cecil' },
  ],
});
