import { register } from '../../register.js';

register({
  tech: 'azure.appservice',
  name: 'Azure App Service',
  type: 'hosting',
  dependencies: [
    { type: 'terraform.resource', name: /^azurerm_(?:app_service|linux_web_app|windows_web_app)(?:_|$)/, example: 'azurerm_linux_web_app' },
    { type: 'githubAction', name: 'Azure/webapps-deploy' },
    { type: 'githubAction', name: 'Azure/appservice-build' },
  ],
});
