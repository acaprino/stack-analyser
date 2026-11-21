import { detectDockerComponent } from './component.js';
import { detectDockerfile } from './dockerfile.js';
import { register } from '../../../register.js';

register({
  tech: 'docker',
  name: 'Docker',
  type: 'tool',
  files: ['.dockerignore'],
  detect: [detectDockerComponent, detectDockerfile],
  dependencies: [
    { type: 'githubAction', name: 'docker/login-action' },
    { type: 'npm', name: '@pulumi/docker' },
  ],
});
