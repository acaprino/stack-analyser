import { register } from '../../register.js';

register({
  tech: 'mybatis',
  name: 'MyBatis',
  type: 'orm',
  dependencies: [
    { type: 'maven', name: 'org.mybatis.spring.boot:mybatis-spring-boot-starter' },
    { type: 'maven', name: 'org.mybatis:mybatis' },
  ],
});
