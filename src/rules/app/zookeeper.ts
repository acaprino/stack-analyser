import { register } from '../../register.js';

register({
  tech: 'zookeeper',
  name: 'Zookeeper',
  type: 'app',
  dependencies: [
    { type: 'docker', name: /^zookeeper(?:\/|$)/, example: 'zookeeper' },
    { type: 'docker', name: 'bitnami/zookeeper' },
    { type: 'docker', name: 'confluentinc/cp-zookeeper' },
    { type: 'rust', name: 'zookeeper' },
    { type: 'ruby', name: 'zookeeper' },
    { type: 'php', name: 'sparkinfluence/zookeeper' },
  ],
});
