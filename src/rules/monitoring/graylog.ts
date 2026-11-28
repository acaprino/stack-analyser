import { register } from '../../register.js';

register({
  tech: 'graylog',
  name: 'Graylog',
  type: 'monitoring',
  dependencies: [{ type: 'nuget', name: 'Serilog.Sinks.Graylog' }],
});
