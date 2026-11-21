import { register } from '../../register.js';

register({
  tech: 'mockserver',
  name: 'MockServer',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'org.mock-server:mockserver-netty-no-dependencies' },
  ],
});
