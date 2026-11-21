import { register } from '../../register.js';

register({
  tech: 'testng',
  name: 'TestNG',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'org.testng:testng' },
  ],
});
