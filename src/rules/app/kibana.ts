import { register } from '../../register.js';

register({
  tech: 'kibana',
  name: 'Kibana',
  type: 'app',
  dotenv: ['KIBANA_'],
  dependencies: [
    { type: 'docker', name: /^kibana(?:\/|$)/, example: 'kibana' },
    { type: 'docker', name: 'docker.elastic.co/kibana/kibana' },
    { type: 'docker', name: 'docker.elastic.co/kibana/kibana-oss' },
    { type: 'docker', name: 'bitnami/kibana' },
  ],
});
