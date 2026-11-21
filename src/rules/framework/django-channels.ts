import { register } from '../../register.js';

register({
  tech: 'django-channels',
  name: 'Django Channels',
  type: 'framework',
  dependencies: [
    { type: 'python', name: 'channels' },
  ],
});
