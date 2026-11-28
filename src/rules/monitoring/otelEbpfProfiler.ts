import { register } from '../../register.js';

register({
  tech: 'otel-ebpf-profiler',
  name: 'OpenTelemetry eBPF Profiler',
  type: 'monitoring',
  dependencies: [
    {
      type: 'docker',
      name: 'ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-ebpf-profiler',
    },
  ],
});
