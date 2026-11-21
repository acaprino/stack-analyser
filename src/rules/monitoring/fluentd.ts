import { register } from '../../register.js';

register({
  tech: 'fluentd',
  name: 'Fluentd',
  type: 'monitoring',
  dependencies: [
    { type: 'golang', name: 'github.com/fluent/fluent-logger-golang' },
    { type: 'docker', name: 'fluentd' },
  ],
});
