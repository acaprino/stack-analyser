import { register } from '../../register.js';

register({
  tech: 'dask',
  name: 'Dask',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'dask' }],
});
