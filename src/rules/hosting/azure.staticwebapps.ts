import { register } from '../../register.js';

register({
  tech: 'azure.staticwebapps',
  name: 'Azure Static Web Apps',
  type: 'hosting',
  dependencies: [
    {
      type: 'terraform.resource',
      name: /^azurerm_static_(?:web_app|site)(?:_|$)/,
      example: 'azurerm_static_web_app',
    },
    { type: 'npm', name: '@azure/static-web-apps-cli' },
    { type: 'githubAction', name: 'Azure/static-web-apps-deploy' },
  ],
});
