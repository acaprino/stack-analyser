import { register } from '../../register.js';

register({
  tech: 'event-store',
  name: 'Event Store',
  type: 'db',
  dependencies: [
    { type: 'npm', name: '@eventstore/db-client' },
    { type: 'golang', name: 'github.com/EventStore/EventStore-Client-Go' },
  ],
});
