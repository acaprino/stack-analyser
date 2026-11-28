import { register } from '../../register.js';

register({
  tech: 'grafana.lgtm',
  name: 'Grafana LGTM',
  type: 'monitoring',
  dependencies: [{ type: 'docker', name: 'grafana/otel-lgtm' }],
});
