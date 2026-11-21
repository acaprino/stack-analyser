import { register } from '../../register.js';

register({
  tech: 'adobe.commercecloud',
  name: 'Adobe Commerce Cloud',
  type: 'cms',
  dependencies: [
    { type: 'php', name: 'magento/magento-cloud-metapackage' },
    { type: 'php', name: 'magento/ece-tools' },
  ],
});
