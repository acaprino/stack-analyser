import { register } from '../../register.js';

register({
  deploymentConfig: true,
  tech: 'platformsh',
  name: 'Platform.sh',
  type: 'hosting',
  files: ['.platform.app.yaml'],
});
