import { register } from '../../register.js';

register({
  tech: 'spring-cloud-netflix',
  name: 'Spring Cloud Netflix',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.cloud:spring-cloud-starter-netflix-eureka-client' },
    { type: 'maven', name: 'org.springframework.cloud:spring-cloud-starter-netflix-eureka-server' },
  ],
});
