import { register } from '../../register.js';

register({
  tech: 'entity-framework-core',
  name: 'Entity Framework Core',
  type: 'orm',
  dependencies: [
    { type: 'nuget', name: 'Aspire.Npgsql.EntityFrameworkCore.PostgreSQL' },
    { type: 'nuget', name: 'Microsoft.EntityFrameworkCore' },
    { type: 'nuget', name: 'Npgsql.EntityFrameworkCore.PostgreSQL' },
    { type: 'nuget', name: /^Microsoft\.EntityFrameworkCore\./i, example: 'Microsoft.EntityFrameworkCore.Cosmos' },
  ],
});
