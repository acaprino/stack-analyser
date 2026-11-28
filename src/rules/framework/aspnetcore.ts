import { register } from '../../register.js';

register({
  tech: 'aspnetcore',
  name: 'ASP.NET Core',
  type: 'framework',
  dependencies: [
    {
      type: 'nuget',
      name: /^Microsoft\.AspNetCore\./i,
      example: 'Microsoft.AspNetCore.Authentication.JwtBearer',
    },
  ],
});
