import { register } from '../../register.js';

// The core container and web modules; Spring MVC (spring-webmvc) and WebFlux have rules of their own.
register({
  tech: 'spring-framework',
  name: 'Spring Framework',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework:spring-beans' },
    { type: 'maven', name: 'org.springframework:spring-context' },
    { type: 'maven', name: 'org.springframework:spring-core' },
    { type: 'maven', name: 'org.springframework:spring-web' },
  ],
});
