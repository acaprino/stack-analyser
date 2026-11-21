import { register } from '../../register.js';

register({
  tech: 'azure.storage',
  name: 'Azure Storage',
  type: 'storage',
  dependencies: [
    {
      type: 'terraform.resource',
      name: /^azurerm_hpc_/,
      example: 'azurerm_hpc_cache',
    },
    {
      type: 'terraform.resource',
      name: /^azurerm_storage_/,
      example: 'azurerm_storage_account',
    },
    { type: 'npm', name: '@azure/storage-queue' },
    { type: 'npm', name: '@azure/storage-file-share' },
    { type: 'npm', name: '@azure/storage-file-datalake' },
    { type: 'ruby', name: 'azure-storage' },
    { type: 'ruby', name: 'azure-storage-common' },
    { type: 'ruby', name: 'azure-storage-table' },
    { type: 'ruby', name: 'azure-storage-file' },
    { type: 'ruby', name: 'azure-storage-queue' },
    { type: 'ruby', name: 'azure_mgmt_storage' },
    { type: 'ruby', name: 'fluent-plugin-azurestorage' },
    { type: 'ruby', name: 'fluent-plugin-azurestorage-gen2' },
    { type: 'php', name: 'microsoft/azure-storage-common' },
    { type: 'php', name: 'microsoft/azure-storage-table' },
    { type: 'php', name: 'microsoft/azure-storage-file' },
    { type: 'php', name: 'microsoft/azure-storage-queue' },
    { type: 'php', name: 'matthewbdaly/laravel-azure-storage' },
    { type: 'rust', name: 'azure_storage' },
    { type: 'rust', name: 'azure_storage_queues' },
    { type: 'rust', name: 'azure_storage_datalake' },
  ],
});
