import { register } from '../../register.js';

register({
  tech: 'langchain-corporate',
  name: 'LangChain Corporate',
  type: 'saas',
  dependencies: [
    { type: 'npm', name: 'langsmith' },
    { type: 'python', name: 'langsmith' },
  ],
});
