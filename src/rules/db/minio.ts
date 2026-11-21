import { register } from '../../register.js';

register({
  tech: 'minio',
  name: 'MinIO',
  type: 'db',
  dependencies: [
    { type: 'docker', name: 'minio/minio' },
    { type: 'docker', name: 'pgsty/minio' },
    { type: 'golang', name: 'github.com/minio/minio-go/v7' },
    { type: 'maven', name: 'io.minio:minio' },
  ],
});
