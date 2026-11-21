import { register } from '../../register.js';

register({
  tech: 'trayio',
  name: 'Tray.ai',
  type: 'etl',
  dependencies: [{ type: 'npm', name: /^@trayio\//, example: '@trayio/cdk-cli' }],
});
