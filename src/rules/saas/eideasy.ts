import { register } from '../../register.js';

register({
  tech: 'eideasy',
  name: 'eID Easy',
  type: 'saas',
  hosts: ['id.eideasy.com'],
  dependencies: [{ type: 'npm', name: '@eid-easy/eideasy-widget' }],
});
