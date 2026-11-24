import { register } from '../../register.js';

register({
  tech: 'influxdb',
  name: 'InfluxDB',
  type: 'db',
  dependencies: [
    { type: 'npm', name: '@influxdata/influxdb-client' },
    { type: 'docker', name: /^influxdb(?:\/|$)/, example: 'influxdb' },
    { type: 'docker', name: 'bitnami/influxdb' },
    { type: 'docker', name: 'quay.io/influxdb/influxdb' },
    { type: 'rust', name: 'influxdb' },
    { type: 'rust', name: 'influxdb2' },
    { type: 'ruby', name: 'influxdb-client' },
    { type: 'php', name: 'influxdata/influxdb-client-php' },
    { type: 'python', name: 'influxdb-client' },
    { type: 'golang', name: 'github.com/influxdata/influxdb-client-go/v2' },
  ],
});
