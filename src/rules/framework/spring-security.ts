import { register } from '../../register.js';

register({
  tech: 'spring-security',
  name: 'Spring Security',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-security' },
    { type: 'maven', name: 'org.springframework.security:spring-security-core' },
    { type: 'maven', name: 'org.springframework.security:spring-security-web' },
    { type: 'maven', name: 'org.springframework.security:spring-security-data' },
  ],
});
