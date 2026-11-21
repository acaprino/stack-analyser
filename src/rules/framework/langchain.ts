import { register } from '../../register.js';

register({
  tech: 'langchain',
  name: 'LangChain',
  type: 'framework',
  dependencies: [
    { type: 'python', name: 'langchain' },
    { type: 'npm', name: 'langchain' },
  ],
});
