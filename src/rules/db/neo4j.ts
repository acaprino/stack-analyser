import { register } from '../../register.js';

register({
  tech: 'neo4j',
  name: 'Neo4j',
  type: 'db',
  dependencies: [
    { type: 'npm', name: 'neo4j-driver' },
    { type: 'docker', name: /^neo4j(?:\/|$)/, example: 'neo4j' },
    { type: 'docker', name: 'bitnami/neo4j' },
    { type: 'rust', name: 'neo4rs' },
    { type: 'ruby', name: 'neo4j-ruby-driver' },
    { type: 'python', name: 'neo4j-driver' },
    { type: 'golang', name: 'github.com/neo4j/neo4j-go-driver/v5' },
    // The starter brings Spring Data Neo4j and the Neo4j Java driver.
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-data-neo4j' },
  ],
});
