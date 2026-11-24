import { register } from '../../register.js';

register({
  tech: 'couchbase',
  name: 'Couchbase',
  type: 'db',
  dependencies: [
    { type: 'npm', name: 'couchbase' },
    { type: 'docker', name: /^couchbase(?:\/|$)/, example: 'couchbase' },
    { type: 'rust', name: 'couchbase' },
    { type: 'ruby', name: 'couchbase' },
    {
      type: 'terraform',
      name: 'registry.terraform.io/couchbasecloud/couchbasecapella',
    },
    { type: 'php', name: 'couchbase/couchbase' },
    { type: 'terraform.resource', name: 'airbyte_source_couchbase' },
    { type: 'python', name: 'couchbase' },
    { type: 'golang', name: 'github.com/couchbase/go-couchbase' },
    // The starters bring Spring Data Couchbase and the Couchbase Java SDK.
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-couchbase' },
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-couchbase-reactive' },
  ],
});
