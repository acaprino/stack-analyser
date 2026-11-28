import { register } from '../../register.js';

register({
  tech: 'spring-amqp',
  name: 'Spring AMQP',
  type: 'framework',
  dependencies: [{ type: 'maven', name: 'org.springframework.boot:spring-boot-starter-amqp' }],
});
