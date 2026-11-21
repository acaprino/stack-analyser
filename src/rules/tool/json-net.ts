import { register } from '../../register.js';

register({
  tech: 'json-net',
  name: 'Json.NET',
  type: 'tool',
  dependencies: [
    { type: 'nuget', name: 'Newtonsoft.Json' },
  ],
});
