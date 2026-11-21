import { register } from '../../register.js';

register({
  tech: 'alipay',
  name: 'Alipay',
  type: 'payment',
  dependencies: [
    { type: 'npm', name: 'alipay-sdk' },
    { type: 'maven', name: 'com.alipay.sdk:alipay-sdk-java' },
  ],
});
