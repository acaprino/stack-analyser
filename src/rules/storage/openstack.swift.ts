import { register } from '../../register.js';

register({
  tech: 'openstack.swift',
  name: 'OpenStack Swift',
  type: 'storage',
  dependencies: [
    { type: 'python', name: 'django-storage-swift' },
  ],
});
