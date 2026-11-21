import { register } from '../../register.js';

register({
  tech: 'spring-data-elasticsearch',
  name: 'Spring Data Elasticsearch',
  type: 'framework',
  dependencies: [
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-elasticsearch' },
  ],
});
