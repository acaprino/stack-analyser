import { register } from '../../register.js';

register({
  tech: 'dotnet',
  name: '.NET SDK',
  type: 'builder',
  // An MSBuild project of C#, F# or Visual Basic: `dotnet build` (or MSBuild) builds it.
  files: /\.(?:cs|fs|vb)proj$/,
  example: 'App.csproj',
});
