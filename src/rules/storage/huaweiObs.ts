import { register } from '../../register.js';

register({
  tech: 'huawei-obs',
  name: 'Huawei Cloud OBS',
  type: 'storage',
  dependencies: [{ type: 'golang', name: 'github.com/huaweicloud/huaweicloud-sdk-go-obs' }],
});
