import { register } from '../../register.js';

register({
  tech: 'fastendpoints',
  name: 'FastEndpoints',
  type: 'framework',
  dependencies: [
    { type: 'nuget', name: 'FastEndpoints' },
    { type: 'nuget', name: 'FastEndpoints.ApiExplorer' },
    { type: 'nuget', name: 'FastEndpoints.Swagger' },
    { type: 'nuget', name: 'FastEndpoints.Swagger.Swashbuckle' },
  ],
});
