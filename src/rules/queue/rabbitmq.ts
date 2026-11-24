import { register } from '../../register.js';

register({
  tech: 'rabbitmq',
  name: 'RabbitMQ',
  type: 'queue',
  dotenv: ['RABBITMQ_'],
  dependencies: [
    { type: 'npm', name: 'amqplib' },
    { type: 'npm', name: '@opentelemetry/instrumentation-amqplib' },
    { type: 'docker', name: /^rabbitmq(?:\/|$)/, example: 'rabbitmq' },
    { type: 'docker', name: 'bitnami/rabbitmq' },
    { type: 'rust', name: 'rabbitmq-stream-client' },
    { type: 'ruby', name: 'bunny' },
    { type: 'php', name: 'php-amqplib/php-amqplib' },
    { type: 'npm', name: '@pulumi/rabbitmq' },
    { type: 'python', name: 'amqp' },
    { type: 'php', name: 'php-amqplib/rabbitmq-bundle' },
    { type: 'nuget', name: 'Aspire.Hosting.RabbitMQ' },
    { type: 'nuget', name: 'Aspire.RabbitMQ.Client' },
    { type: 'maven', name: 'com.rabbitmq:amqp-client' },
    // The starter brings spring-rabbit and the RabbitMQ Java client: its broker is RabbitMQ.
    { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-amqp' },
    { type: 'nuget', name: 'RabbitMQ.Client' },
  ],
});
