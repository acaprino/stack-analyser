import { register } from '../../register.js';

register({
  tech: 'azure.applicationinsights',
  name: 'Azure Application Insights',
  type: 'monitoring',
  dependencies: [
    { type: 'nuget', name: 'Serilog.Sinks.ApplicationInsights' },
  ],
});
