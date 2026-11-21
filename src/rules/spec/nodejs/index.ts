import { detectNodeComponent } from './component.js';
import { register } from '../../../register.js';

register({
  tech: 'nodejs',
  name: 'NodeJS',
  type: 'runtime',
  files: ['package.json'],
  dependencies: [
    { type: 'docker', name: /^nodejs(?:\/|$)/, example: 'nodejs' },
    { type: 'docker', name: 'node' },
    { type: 'docker', name: 'circleci/node' },
    { type: 'docker', name: 'cimg/node' },
    { type: 'docker', name: 'bitnami/node' },
    { type: 'docker', name: 'okteto/node' },
    { type: 'docker', name: 'gcr.io/distroless/nodejs24-debian13' },
  ],
  detect: detectNodeComponent,
});
