import { detectNugetComponent } from '../spec/nuget/component.js';
import { register } from '../../register.js';

register({
  tech: 'nuget',
  name: 'NuGet',
  type: 'package_manager',
  files: ['.csproj'],
  detect: detectNugetComponent,
});
