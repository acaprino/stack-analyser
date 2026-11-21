import { register } from '../../register.js';

register({
  tech: 'netbox-copilot',
  name: 'NetBox Copilot',
  type: 'saas',
  dotenv: ['NETBOX_COPILOT_URL'],
  hosts: ['static.copilot.netboxlabs.ai'],
});
