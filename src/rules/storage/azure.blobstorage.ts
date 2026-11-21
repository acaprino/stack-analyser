import { register } from '../../register.js';

register({
  tech: 'azure.blobstorage',
  name: 'Azure Blob Storage',
  type: 'storage',
  dependencies: [
    { type: 'npm', name: '@azure/storage-blob' },
    { type: 'ruby', name: 'azure-blob' },
    { type: 'ruby', name: 'azure-storage-blob' },
    { type: 'ruby', name: 'logstash-input-azureblob' },
    { type: 'php', name: 'league/flysystem-azure-blob-storage' },
    { type: 'php', name: 'microsoft/azure-storage-blob' },
    { type: 'rust', name: 'azure_storage_blobs' },
    { type: 'terraform.resource', name: 'airbyte_destination_azure_blob_storage' },
    { type: 'python', name: 'azure-storage-blob' },
    { type: 'golang', name: 'github.com/azure/azure-storage-blob-go' },
  ],
});
