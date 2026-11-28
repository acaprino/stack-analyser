import { register } from '../../register.js';

register({
  tech: 'jhipster-control-center',
  name: 'JHipster Control Center',
  type: 'saas',
  dependencies: [{ type: 'docker', name: 'jhipster/jhipster-control-center' }],
});
