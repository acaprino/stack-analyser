import { register } from '../../register.js';

register({
  tech: 'gcp.vertex',
  name: 'Vertex AI',
  type: 'ai',
  dotenv: ['VERTEX_AI', 'VERTEX_AI_', 'GOOGLE_VERTEX_PROJECT_ID'],
  dependencies: [
    { type: 'npm', name: '@ai-sdk/google-vertex' },
    { type: 'npm', name: '@google-cloud/vertexai' },
    { type: 'npm', name: '@langchain/google-vertexai' },
    { type: 'python', name: 'vertexai' },
  ],
});
