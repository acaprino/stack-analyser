import { register } from '../../register.js';

register({
  tech: 'otel-collector',
  name: 'OpenTelemetry Collector',
  type: 'monitoring',
  dependencies: [
    { type: 'docker', name: 'ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib' },
  ],
});
