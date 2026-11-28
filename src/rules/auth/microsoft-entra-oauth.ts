import { register } from '../../register.js';

register({
  tech: 'microsoft-entra-oauth',
  name: 'Microsoft Entra ID OAuth',
  type: 'auth',
  dependencies: [{ type: 'php', name: 'socialiteproviders/microsoft-azure' }],
});
