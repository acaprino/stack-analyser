import { register } from '../../register.js';

register({
  tech: 'avro',
  name: 'Apache Avro',
  type: 'tool',
  dependencies: [
    { type: 'maven', name: 'io.quarkus:quarkus-apicurio-registry-avro' },
    { type: 'maven', name: 'org.apache.avro:avro' },
  ],
});
