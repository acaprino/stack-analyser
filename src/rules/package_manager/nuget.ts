import { register } from '../../register.js';
import { detectNugetComponent } from '../spec/nuget/component.js';

register({
  tech: 'nuget',
  name: 'NuGet',
  type: 'package_manager',
  files: ['.csproj'],
  detect: detectNugetComponent,
});
