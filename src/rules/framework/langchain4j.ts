import { register } from '../../register.js';

register({
  tech: 'langchain4j',
  name: 'LangChain4j',
  type: 'framework',
  dependencies: [{ type: 'maven', name: 'io.quarkiverse.langchain4j:quarkus-langchain4j-openai' }],
});
