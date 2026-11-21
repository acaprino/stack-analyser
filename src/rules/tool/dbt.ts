import { register } from '../../register.js';

register({
  tech: 'dbt',
  name: 'dbt',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'dbt-core' }],
});
