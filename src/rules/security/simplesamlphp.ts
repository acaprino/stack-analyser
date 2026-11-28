import { register } from '../../register.js';

register({
  tech: 'simplesamlphp',
  name: 'SimpleSAMLphp',
  type: 'security',
  dotenv: ['SIMPLESAMLPHP_SP_ASSERTION_CONSUMER_SERVICE'],
  dependencies: [{ type: 'docker', name: 'kenchan0130/simplesamlphp' }],
});
