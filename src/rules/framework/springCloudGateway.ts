import { register } from '../../register.js';

register({
  tech: 'spring-cloud-gateway',
  name: 'Spring Cloud Gateway',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.cloud:spring-cloud-gateway-server' },
    { type: 'maven', name: 'org.springframework.cloud:spring-cloud-starter-gateway' },
    {
      type: 'maven',
      name: 'org.springframework.cloud:spring-cloud-starter-gateway-server-webflux',
    },
  ],
});
