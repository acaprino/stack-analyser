import { register } from '../../register.js';

register({
  tech: 'jms-serializer',
  name: 'JMS Serializer',
  type: 'tool',
  dependencies: [
    { type: 'php', name: 'jms/serializer' },
    { type: 'php', name: 'jms/serializer-bundle' },
  ],
});
