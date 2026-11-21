import { register } from '../../register.js';

register({
  tech: 'aliyun-oss',
  name: 'Aliyun OSS',
  type: 'storage',
  dependencies: [
    { type: 'maven', name: 'com.aliyun.oss:aliyun-sdk-oss' },
    { type: 'golang', name: 'github.com/aliyun/aliyun-oss-go-sdk' },
  ],
});
