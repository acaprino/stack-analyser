import { detectGithubActionsComponent } from './component.js';
import { register } from '../../../register.js';

register({
  tech: 'github.actions',
  name: 'Github Actions',
  type: 'ci',
  detect: detectGithubActionsComponent,
});
