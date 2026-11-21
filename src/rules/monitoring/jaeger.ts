import { register } from '../../register.js';

register({
  tech: 'jaeger',
  name: 'Jaeger',
  type: 'monitoring',
  dependencies: [
    { type: 'golang', name: 'github.com/jaegertracing/jaeger' },
    { type: 'docker', name: 'quay.io/jaegertracing/jaeger' },
  ],
});
