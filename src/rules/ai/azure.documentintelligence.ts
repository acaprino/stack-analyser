import { register } from '../../register.js';

register({
  tech: 'azure.documentintelligence',
  name: 'Azure AI Document Intelligence',
  type: 'ai',
  dependencies: [
    { type: 'python', name: 'azure-ai-documentintelligence' },
  ],
});
