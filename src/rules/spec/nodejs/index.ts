import { detectNodeComponent } from './component.js';
import { register } from '../../../register.js';

register({
  tech: 'nodejs',
  name: 'NodeJS',
  type: 'runtime',
  files: ['package.json'],
  dependencies: [
    { type: 'githubAction', name: 'actions/setup-node' },
    { type: 'docker', name: /^nodejs(?:\/|$)/, example: 'nodejs' },
    { type: 'docker', name: 'node' },
    { type: 'docker', name: 'circleci/node' },
    { type: 'docker', name: 'cimg/node' },
    { type: 'docker', name: 'bitnami/node' },
    { type: 'docker', name: 'okteto/node' },
    { type: 'docker', name: 'gcr.io/distroless/nodejs24-debian13' },
    {
      type: 'docker',
      name: /^gcr\.io\/distroless\/nodejs(?:\d+-debian\d+)?$/,
      example: 'gcr.io/distroless/nodejs20-debian12',
    },
    // Red Hat's Node.js images.
    {
      type: 'docker',
      name: /^(?:registry\.access\.redhat\.com|registry\.redhat\.io)\/ubi\d+\/nodejs-\d+(?:-minimal)?$/,
      example: 'registry.access.redhat.com/ubi8/nodejs-18',
    },
  ],
  detect: detectNodeComponent,
});
