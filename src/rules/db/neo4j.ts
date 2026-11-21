import { register } from '../../register.js';

register({
  tech: 'neo4j',
  name: 'Neo4j',
  type: 'db',
  dependencies: [
    { type: 'npm', name: 'neo4j-driver' },
    { type: 'docker', name: /^neo4j(?:\/|$)/, example: 'neo4j' },
    { type: 'rust', name: 'neo4rs' },
    { type: 'ruby', name: 'neo4j-ruby-driver' },
    { type: 'python', name: 'neo4j-driver' },
    { type: 'golang', name: 'github.com/neo4j/neo4j-go-driver/v5' },
  ],
});
