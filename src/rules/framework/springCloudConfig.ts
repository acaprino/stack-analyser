import { register } from '../../register.js';

register({
  tech: 'spring-cloud-config',
  name: 'Spring Cloud Config',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.cloud:spring-cloud-config-server' },
    { type: 'maven', name: 'org.springframework.cloud:spring-cloud-starter-config' },
  ],
});
