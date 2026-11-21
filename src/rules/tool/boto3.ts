import { register } from '../../register.js';

register({
  tech: 'boto3',
  name: 'Boto3',
  type: 'tool',
  dependencies: [{ type: 'python', name: 'boto3' }],
});
