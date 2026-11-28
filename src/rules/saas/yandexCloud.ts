import { register } from '../../register.js';

register({
  tech: 'yandex-cloud',
  name: 'Yandex Cloud',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'yandexcloud' }],
});
