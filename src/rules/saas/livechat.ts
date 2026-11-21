import { register } from '../../register.js';

register({
  tech: 'livechat',
  name: 'LiveChat',
  type: 'saas',
  dependencies: [{ type: 'npm', name: '@livechat/customer-sdk' }],
});
