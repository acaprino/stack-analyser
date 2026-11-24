import { register } from '../../register.js';

register({
  tech: 'elasticsearch',
  name: 'Elasticsearch',
  type: 'db',
  dotenv: ['ELASTICSEARCH_'],
  dependencies: [
    { type: 'npm', name: '@elastic/elasticsearch' },
    { type: 'docker', name: /^elasticsearch(?:\/|$)/, example: 'elasticsearch' },
    { type: 'docker', name: 'docker.elastic.co/elasticsearch/elasticsearch' },
    { type: 'docker', name: 'docker.elastic.co/elasticsearch/elasticsearch-oss' },
    { type: 'docker', name: 'bitnami/elasticsearch' },
    {
      type: 'terraform',
      name: 'registry.terraform.io/phillbaker/elasticsearch',
    },
    { type: 'rust', name: 'elasticsearch' },
    { type: 'ruby', name: 'elasticsearch' },
    { type: 'php', name: 'elasticsearch/elasticsearch' },
    { type: 'php', name: 'ruflin/Elastica' },
    { type: 'golang', name: 'github.com/elastic/go-elasticsearch' },
    {
      type: 'githubAction',
      name: 'elastic/elastic-github-actions/elasticsearch',
    },
    { type: 'python', name: 'elasticsearch' },
    { type: 'terraform.resource', name: 'airbyte_destination_elasticsearch' },
    // The starter brings Spring Data Elasticsearch and the Elasticsearch client.
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-elasticsearch' },
  ],
});
