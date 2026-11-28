import { register } from '../../register.js';

register({
  tech: 'jmeter',
  name: 'Apache JMeter',
  type: 'tool',
  dependencies: [{ type: 'maven', name: 'com.lazerycode.jmeter:jmeter-maven-plugin' }],
});
