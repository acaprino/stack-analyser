import { register } from '../../register.js';

register({
  tech: 'spring-ai',
  name: 'Spring AI',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.ai:spring-ai-core' },
    { type: 'maven', name: 'org.springframework.ai:spring-ai-openai-spring-boot-starter' },
    { type: 'maven', name: 'org.springframework.ai:spring-ai-starter-model-openai' },
    { type: 'maven', name: 'org.springframework.ai:spring-ai-vector-store' },
  ],
});
