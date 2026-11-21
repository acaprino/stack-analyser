import { register } from '../../register.js';

register({
  tech: 'django-rest-framework',
  name: 'Django REST framework',
  type: 'framework',
  dependencies: [
    { type: 'python', name: 'djangorestframework' },
  ],
});
