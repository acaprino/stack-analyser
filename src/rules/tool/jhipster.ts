import { register } from '../../register.js';

register({
  tech: 'jhipster',
  name: 'JHipster',
  type: 'tool',
  dependencies: [
    { type: 'npm', name: 'generator-jhipster' },
    { type: 'maven', name: 'tech.jhipster:jhipster-framework' },
  ],
});
