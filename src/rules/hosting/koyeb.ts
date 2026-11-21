import { register } from '../../register.js';

register({
  deploymentConfig: true,
  tech: 'koyeb',
  name: 'Koyeb',
  type: 'hosting',
  files: ['.koyeb.yaml', 'Dockerfile.koyeb'],
  dependencies: [{ type: 'npm', name: 'koyeb-api-client' }],
});
