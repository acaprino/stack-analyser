import { register } from '../../register.js';

register({
  tech: 'microsoft-sql-server',
  name: 'Microsoft SQL Server',
  type: 'db',
  dependencies: [
    { type: 'golang', name: 'github.com/microsoft/go-mssqldb' },
    { type: 'golang', name: 'gorm.io/driver/sqlserver' },
    { type: 'nuget', name: 'Aspire.Hosting.SqlServer' },
    { type: 'nuget', name: 'Microsoft.EntityFrameworkCore.SqlServer' },
  ],
});
