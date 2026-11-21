import { register } from '../../register.js';

register({
  tech: 'agora',
  name: 'Agora',
  type: 'saas',
  dependencies: [{ type: 'npm', name: 'agora-rtc-sdk-ng' }],
});
