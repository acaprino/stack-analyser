import { register } from '../../register.js';

register({
  tech: 'httpx',
  name: 'HTTPX',
  type: 'network',
  dependencies: [{ type: 'python', name: 'httpx' }],
});
