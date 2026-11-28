import { register } from '../../register.js';

register({
  tech: 'tencent-cos',
  name: 'Tencent COS',
  type: 'storage',
  dependencies: [{ type: 'golang', name: 'github.com/tencentyun/cos-go-sdk-v5' }],
});
