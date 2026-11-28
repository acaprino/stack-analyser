import { register } from '../../register.js';

register({
  tech: 'spring-boot',
  name: 'Spring Boot',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.boot:org.springframework.boot.gradle.plugin' },
    { type: 'maven', name: 'org.springframework.boot:spring-boot' },
    { type: 'maven', name: 'org.springframework.boot:spring-boot-autoconfigure' },
    { type: 'maven', name: 'org.springframework.boot:spring-boot-dependencies' },
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter' },
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-parent' },
    { type: 'maven', name: /^org\.springframework\.boot$/, example: 'org.springframework.boot' },
    {
      type: 'maven',
      name: /^org\.springframework\.boot:spring-boot(?:-[a-z0-9]+)*$/,
      example: 'org.springframework.boot:spring-boot-starter-web',
    },
  ],
});
