import { register } from '../../register.js';

register({
  tech: 'wandb',
  name: 'Weights & Biases',
  type: 'saas',
  dependencies: [{ type: 'python', name: 'wandb' }],
});
