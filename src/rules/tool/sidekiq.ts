import { register } from '../../register.js';

register({
  tech: 'sidekiq',
  name: 'Sidekiq',
  type: 'tool',
  dependencies: [{ type: 'ruby', name: 'sidekiq' }],
});
